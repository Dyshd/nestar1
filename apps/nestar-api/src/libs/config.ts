import { ObjectId } from 'bson'
export const availableAgentSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank']
export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews']
export const availableOptions = ['propertyBarter', "propertyRent"];
export const availablePropertySorts = [
  'createdAt',
  'updatedAt',
  'propertyLikes',
  'propertyViews',
  'propertyRank',
  'propertyPrice',
];

export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleWiews']
export const availableCommentSorts = ['createdAt', 'updatedAt']

// IMAGE CONFIGURATION
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { LookupAuthMemberFollowed, T } from './types/common'; // 🔹 TO‘G‘RI TURLI IMPORT QILINADI

export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];

export const getSerialForImage = (filename: string) => {
  const ext = path.parse(filename).ext;
  return uuidv4() + ext; // 🔹 UNIQUE IMAGE NOMINI GENERATE QILISH
};

export const shapeIntoMongoObjectId = (target: any) => {
  // 🔹 Agar string kelsa ObjectId ga aylantirish, aks holda o‘sha ObjectId ni qaytaradi
  return typeof target === 'string' ? new ObjectId(target) : target;
};

export const lookupMember = {
  $lookup: {
    from: 'members',
    localField: 'memberId',
    foreignField: '_id',
    as: 'memberData',
  }
}

// 🔹 MANTIQ O‘ZGARTIRILDI: meLiked uchun aggregate $lookup
export const lookupAuthMemberLiked = (memberId: T, targetRefId: string = '$_id') => { // 🔹 UZGARTIRILDI
  return {
    $lookup: {
      from: 'likes',
      let: {
        localLikeRefId: targetRefId,
        localMemberId: memberId,
        localMyFavorite: true, // 🔹 myFavorite flag qo‘shildi
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$likeRefId', '$$localLikeRefId'] },
                { $eq: ['$memberId', '$$localMemberId'] }
              ],
            },
          },
        },
        {
          $project: {
            _id: 0,
            memberId: 1,
            likeRefId: 1,
            myFavorite: '$$localMyFavorite', // 🔹 PROJECT da myFavorite qo‘shildi
          },
        },
      ],
      as: 'meLiked', // 🔹 OUTPUT ARRAY
    },
  };
};

// 🔹 MANTIQ O‘ZGARTIRILDI: meFollowed uchun $lookup
export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => { // 🔹 UZGARTIRILDI
  const { followerId, followingId } = input;
  return {
    $lookup: {
      from: 'follows',
      let: {
        localFollowerId: followerId,
        localFollowingId: followingId,
        localMyFavorite: true, // 🔹 myFavorite flag qo‘shildi
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$followerId', '$$localFollowerId'] },
                { $eq: ['$followingId', '$$localFollowingId'] }
              ],
            },
          },
        },
        {
          $project: {
            _id: 0,
            followerId: 1,
            followingId: 1,
            myFollowing: '$$localMyFavorite', // 🔹 PROJECT da myFavorite qo‘shildi
          },
        },
      ],
      as: 'meFollowed', // 🔹 OUTPUT ARRAY
    },
  };
};

// 🔹 FOLLOWING DATA AGGREGATE $LOOKUP
export const lookupFollowingData = {
  $lookup: {
    from: 'members',
    localField: 'followingId',
    foreignField: '_id',
    as: 'followingData', // 🔹 Output field
  },
};

// 🔹 FOLLOWER DATA AGGREGATE $LOOKUP
export const lookupFollowerData = {
  $lookup: {
    from: 'members',
    localField: 'followerId',
    foreignField: '_id',
    as: 'followerData', // 🔹 Output field
  },


};

export const lookupFavorite = {
  $lookup: {
    from: 'members',
    localField: 'favoriteProperty.memberId',
    foreignField: '_id',
    as: 'favoriteProperty.memberData', // 🔹 Output field
  },
};

export const lookupVisit = {
  $lookup: {
    from: 'members',
    localField: 'visitedProperty.memberId',
    foreignField: '_id',
    as: 'visitedProperty.memberData',
  },
};
