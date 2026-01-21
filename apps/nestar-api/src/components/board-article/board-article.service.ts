import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import {
  AllBoardArticlesInquiry,
  BoardArticleInput,
  BoardArticlesInquiry,
} from '../../libs/dto/board-article/board-article.input';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';

import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { LikeService } from '../like/like.service';

import { Direction, Message } from '../../libs/enums/common.enum';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { LikeGroup } from '../../libs/enums/like.enum';

import { LikeInput } from '../../libs/dto/like/like.input';
import { ViewInput } from '../../libs/dto/view/view.input';

import { T } from '../../libs/types/common';
import {
  lookupAuthMemberLiked,
  shapeIntoMongoObjectId,
} from '../../libs/config';

@Injectable()
export class BoardArticleService {
  constructor(
    @InjectModel('BoardArticle')
    private readonly boardArticleModel: Model<BoardArticle>,
    private readonly memberService: MemberService,
    private readonly viewService: ViewService,
    private readonly likeService: LikeService,
  ) {}

  // ---------------- CREATE ----------------
  public async createBoardArticle(
    memberId: ObjectId,
    input: BoardArticleInput,
  ): Promise<BoardArticle> {
    input.memberId = memberId;

    try {
      const result = await this.boardArticleModel.create(input);

      await this.memberService.memberStatusEditor({
        _id: memberId,
        targetKey: 'memberArticles',
        modifier: 1,
      });

      return result;
    } catch (err: any) {
      console.log('Error, createBoardArticle:', err?.message);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }

  // ---------------- GET ONE ----------------
  public async getBoardArticle(
    memberId: ObjectId,
    articleId: ObjectId,
  ): Promise<BoardArticle> {
    const search: T = {
      _id: articleId,
      articleStatus: BoardArticleStatus.ACTIVE,
    };

    const target = await this.boardArticleModel.findOne(search).lean().exec();
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const article = target as any; // lean() bo‘lgani uchun any

    // default guest qiymatlar
    article.meLiked = false;

    // ---- If member is logged in ----
    if (memberId) {
      // ----------- VIEW -----------
      try {
        const viewInput: ViewInput = {
          memberId,
          viewRefId: articleId,
          viewGroup: ViewGroup.ARTICLE,
        };

        const newView = await this.viewService.recordView(viewInput);

        if (newView) {
          await this.boardArticleStatsEditor({
            _id: articleId,
            targetKey: 'articleViews',
            modifier: 1,
          });

          article.articleViews = (article.articleViews ?? 0) + 1;
        }
      } catch (e: any) {
        console.log('WARN: recordView failed:', e?.message);
      }

      // ----------- LIKE CHECK -----------
      try {
        const likeInput: LikeInput = {
          memberId,
          likeRefId: articleId,
          likeGroup: LikeGroup.ARTICLE,
        };

        article.meLiked = await this.likeService.checkLikeExistence(likeInput);
      } catch (e: any) {
        console.log('WARN: checkLikeExistence failed:', e?.message);
        article.meLiked = false;
      }
    }

    // ----------- MEMBER DATA LOAD -----------
    try {
      article.memberData = await this.memberService.getMember(
        memberId || undefined,
        article.memberId,
      );
    } catch (e: any) {
      console.log(
        'WARN: memberData not found for memberId:',
        String(article.memberId),
        'err:',
        e?.message,
      );
      article.memberData = null; // DTO nullable bo‘lishi shart
    }

    return article as BoardArticle;
  }

  // ---------------- UPDATE ----------------
  public async updateBoardArticle(
    memberId: ObjectId,
    input: BoardArticleUpdate,
  ): Promise<BoardArticle> {
    const { _id, articleStatus } = input;

    const result = await this.boardArticleModel
      .findOneAndUpdate(
        { _id, memberId, articleStatus: BoardArticleStatus.ACTIVE },
        input,
        { new: true },
      )
      .exec();

    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (articleStatus === BoardArticleStatus.DELETE) {
      await this.memberService.memberStatusEditor({
        _id: memberId,
        targetKey: 'memberArticles',
        modifier: -1,
      });
    }

    return result;
  }

  // ---------------- GET LIST ----------------
  public async getBoardArticles(
    memberId: ObjectId,
    input: BoardArticlesInquiry,
  ): Promise<BoardArticles> {
    // ✅ search bo‘lmasa ham crash bo‘lmasin
    const search = (input?.search ?? {}) as any;
    const articleCategory = search.articleCategory;
    const text = search.text;
    const searchMemberId = search.memberId;

    const match: T = { articleStatus: BoardArticleStatus.ACTIVE };

    // ✅ sort field noto‘g‘ri bo‘lsa ham default
    const sortField = input?.sort ?? 'createdAt';
    const sortDirection = input?.direction ?? Direction.DESC;
    const sort: T = { [sortField]: sortDirection };

    if (articleCategory) match.articleCategory = articleCategory;
    if (text) match.articleTitle = { $regex: new RegExp(text, 'i') };
    if (searchMemberId) match.memberId = shapeIntoMongoObjectId(searchMemberId);

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;

    const result = await this.boardArticleModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupAuthMemberLiked(memberId),
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    // ✅ bo‘sh bo‘lsa ham doim list qaytar
    if (!result?.length) {
      return { list: [], metaCounter: [{ total: 0 }] } as any;
    }

    const data = result[0] ?? ({} as any);
    if (!data.list) data.list = [];
    if (!data.metaCounter?.length) data.metaCounter = [{ total: 0 }];

    return data as BoardArticles;
  }

  // ---------------- LIKE TOGGLE ----------------
  public async likeTargetBoardArticle(
    memberId: ObjectId,
    likeRefId: ObjectId,
  ): Promise<BoardArticle> {
    const target = await this.boardArticleModel
      .findOne({ _id: likeRefId, articleStatus: BoardArticleStatus.ACTIVE })
      .exec();

    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = {
      memberId,
      likeRefId,
      likeGroup: LikeGroup.ARTICLE,
    };

    const modifier = await this.likeService.toggleLike(input);

    const result = await this.boardArticleStatsEditor({
      _id: likeRefId,
      targetKey: 'articleLikes',
      modifier,
    });

    if (!result)
      throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

    return result;
  }

  // ---------------- ADMIN LIST ----------------
  public async getAllBoardArticlesByAdmin(
    input: AllBoardArticlesInquiry,
  ): Promise<BoardArticles> {
    const search = (input?.search ?? {}) as any;
    const articleStatus = search.articleStatus;
    const articleCategory = search.articleCategory;

    const match: T = {};
    const sortField = input?.sort ?? 'createdAt';
    const sortDirection = input?.direction ?? Direction.DESC;
    const sort: T = { [sortField]: sortDirection };

    if (articleStatus) match.articleStatus = articleStatus;
    if (articleCategory) match.articleCategory = articleCategory;

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;

    const agg = await this.boardArticleModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $lookup: {
                  from: 'members',
                  localField: 'memberId',
                  foreignField: '_id',
                  as: 'memberData',
                },
              },
              { $unwind: '$memberData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    const first = agg?.[0] ?? { list: [], metaCounter: [] };
    if (!first.list) first.list = [];
    if (!first.metaCounter?.length) first.metaCounter = [{ total: 0 }];
    return first as BoardArticles;
  }

  // ---------------- ADMIN UPDATE ----------------
  public async updateBoardArticleByAdmin(
    input: BoardArticleUpdate,
  ): Promise<BoardArticle> {
    const { _id, articleStatus } = input;

    const result = await this.boardArticleModel
      .findOneAndUpdate(
        { _id, articleStatus: BoardArticleStatus.ACTIVE },
        input,
        { new: true },
      )
      .exec();

    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (articleStatus === BoardArticleStatus.DELETE) {
      await this.memberService.memberStatusEditor({
        _id: result.memberId,
        targetKey: 'memberArticles',
        modifier: -1,
      });
    }

    return result;
  }

  // ---------------- ADMIN REMOVE ----------------
  public async removeBoardArticleByAdmin(
    articleId: ObjectId,
  ): Promise<BoardArticle> {
    const search: T = { _id: articleId, articleStatus: BoardArticleStatus.DELETE };
    const result = await this.boardArticleModel.findOneAndDelete(search).exec();
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
    return result;
  }

  // ---------------- STATS EDITOR ----------------
  public async boardArticleStatsEditor(input: {
    _id: ObjectId;
    targetKey: string;
    modifier: number;
  }) {
    const { _id, targetKey, modifier } = input;

    return await this.boardArticleModel
      .findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
      .exec();
  }
}
