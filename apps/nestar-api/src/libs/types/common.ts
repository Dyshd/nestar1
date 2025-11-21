import { ObjectId } from "mongoose";

export interface T {
    [key: string]: any;
}

export interface StatisticModifier {
    _id: ObjectId;
    targetKey: string;
    modifier: number;
}

// 🔹 Qo‘shildi: LookupAuthMemberFollowed tipi
export interface LookupAuthMemberFollowed {
    followerId: ObjectId | string;
    followingId: ObjectId | string;
}
