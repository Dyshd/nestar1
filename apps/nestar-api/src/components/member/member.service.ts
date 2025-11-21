import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId } from 'mongoose';
import { Member, Members } from '../../libs/dto/member/member';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { AuthService } from '../auth/auth.service';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { StatisticModifier, T } from '../../libs/types/common';
import { ViewService } from '../view/view.service';
import { ViewInput } from '../../libs/dto/view/view.input';
import { ViewGroup } from '../../libs/enums/view.enum';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { CommentStatus } from '../../libs/enums/comment.enum';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';
import { Follower, Following, MeFollowed } from '../../libs/dto/follow/follow';
import { lookupAuthMemberLiked } from '../../libs/config';

@Injectable()
export class MemberService {
    commentModel: any;

    constructor(
        @InjectModel("Member") private readonly memberModel: Model<Member>,
        @InjectModel("Follow") private readonly followModel: Model<Follower | Following>,
        private authService: AuthService,
        private viewService: ViewService,
        private likeService: LikeService
    ) { }

    public async signup(input: MemberInput): Promise<Member> {
        input.memberPassword = await this.authService.hashPassword(input.memberPassword)

        try {
            const result = await this.memberModel.create(input);
            result.accessToken = await this.authService.createToken(result);
            return result;
        } catch (err) {
            console.log("Error, Service.model:", err.message);
            throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
        }
    }

    public async login(input: LoginInput): Promise<Member> {
        const response: Member | null = await this.memberModel
            .findOne({ memberNick: input.memberNick })
            .select('+memberPassword')
            .exec();

        if (!response || response.memberStatus === MemberStatus.DELETE) {
            throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
        } else if (response.memberStatus === MemberStatus.BLOCK) {
            throw new InternalServerErrorException(Message.BLOCKED_USER);
        }

        const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword);
        if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

        response.accessToken = await this.authService.createToken(response);
        return response;
    }

    public async updateMember(memberId: ObjectId, input: MemberUpdate): Promise<Member> {
        const result = await this.memberModel.findOneAndUpdate(
            { _id: memberId, memberStatus: MemberStatus.ACTIVE },
            input,
            { new: true }
        ).exec();

        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
        result.accessToken = await this.authService.createToken(result);
        return result;
    }

    public async getMember(memberId: ObjectId, targetId: ObjectId): Promise<Member> {
        const search: T = {
            _id: targetId,
            memberStatus: { $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK] },
        };

        const targetMember = await this.memberModel.findOne(search).lean().exec();
        if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        if (memberId) {
            const viewInput: ViewInput = {
                memberId,
                viewRefId: targetId,
                viewGroup: ViewGroup.MEMBER
            };
            const newView = await this.viewService.recordView(viewInput);
            if (newView) {
                await this.memberModel.findOneAndUpdate(
                    search,
                    { $inc: { memberViews: 1 } },
                    { new: true }
                ).exec();
                targetMember.memberViews++;
            }

            const likeInput: LikeInput = {
                memberId,
                likeRefId: targetId,
                likeGroup: LikeGroup.MEMBER
            };
            // 🔹 O'ZGARTIRILDI: GraphQL meLiked qo'shildi
            (targetMember as any).meLiked = await this.likeService.checkLikeExistence(likeInput);

            // 🔹 O'ZGARTIRILDI: meFollowed qo'shildi va ObjectId → string konvertatsiya qilindi
            targetMember.meFollowed = await this.checkSubscription(memberId, targetId);
        }

        return targetMember;
    }

    // 🔹 O'ZGARTIRILDI: ObjectId → string konvertatsiyasi qo'shildi
    private async checkSubscription(followerId: ObjectId, followingId: ObjectId): Promise<MeFollowed[]> {
        const result = await this.followModel.findOne({ followingId, followerId }).exec();
        return result ? [{
            followerId: followerId.toString(),   // 🔹 O'ZGARTIRILDI
            followingId: followingId.toString(), // 🔹 O'ZGARTIRILDI
            myFollowing: true
        }] : [];
    }

    public async getAgents(memberId: ObjectId, input: AgentsInquiry): Promise<Members> {
        const { text } = input.search;
        const match: T = {
            memberType: MemberType.AGENT,
            memberStatus: MemberStatus.ACTIVE,
        };

        const sort: T = { [input?.sort ?? "createdAt"]: input?.direction ?? Direction.DESC };
        if (text) match.memberNick = { $regex: new RegExp(text, 'i') };

        const result = await this.memberModel.aggregate([
            { $match: match },
            { $sort: sort },
            {
                $facet: {
                    list: [
                        { $skip: (input.page - 1) * input.limit },
                        { $limit: input.limit },
                        lookupAuthMemberLiked(memberId),
                    ],
                    metaCounter: [{ $count: "total" }]
                }
            }
        ]).exec();

        return (result[0] ?? { list: [], metaCounter: [] }) as Members;
    }

    public async likeTargetMember(memberId: ObjectId, likeRefId: ObjectId): Promise<Member> {
        const target = await this.memberModel.findOne({ _id: likeRefId, memberStatus: MemberStatus.ACTIVE }).exec();
        if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        const input: LikeInput = {
            memberId,
            likeRefId,
            likeGroup: LikeGroup.MEMBER
        };

        const modifier = await this.likeService.toggleLike(input);
        const result = await this.memberStatusEditor({ _id: likeRefId, targetKey: 'memberLikes', modifier });

        if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
        return result;
    }

    public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
        const { memberStatus, memberType, text } = input.search;
        const match: T = {};
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
        if (memberStatus) match.memberStatus = memberStatus;
        if (memberType) match.memberType = memberType;
        if (text) match.memberNick = { $regex: new RegExp(text, 'i') };

        const result = await this.memberModel.aggregate([
            { $match: match },
            { $sort: sort },
            {
                $facet: {
                    list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
                    metaCounter: [{ $count: 'total' }]
                }
            }
        ]).exec();

        if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
        return result[0];
    }

    public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
        const result = await this.memberModel.findOneAndUpdate({ _id: input._id }, input, { new: true }).exec();
        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
        return result;
    }

    public async memberStatusEditor(input: StatisticModifier): Promise<Member | null> {
        const { _id, targetKey, modifier } = input;
        return await this.memberModel.findByIdAndUpdate(
            _id,
            { $inc: { [targetKey]: modifier } },
            { new: true }
        ).exec();
    }

    public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<any> {
        const { _id } = input;
        const result = await this.commentModel.findOneAndUpdate(
            { _id, memberId, commentStatus: CommentStatus.ACTIVE },
            input,
            { new: true }
        );

        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
        return result;
    }
}
