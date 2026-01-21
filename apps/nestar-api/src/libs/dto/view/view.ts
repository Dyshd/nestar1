import { Field, Int, ObjectType, OmitType } from "@nestjs/graphql";
import type { ObjectId } from "mongoose";
import { MemberAuthType, MemberStatus, MemberType } from "../../enums/member.enum";
import { ViewGroup } from "../../enums/view.enum";



// @ObjectType()
// export class Member {
//     @Field(() => String)
//     _id: ObjectId;

//     @Field(() => MemberType)
//     memberType: MemberType;


//     @Field(() => MemberStatus)
//     memberStatus: MemberStatus;

//     @Field(() => MemberAuthType)
//     memberAuthType: MemberAuthType;

//     @Field(() => String)
//     memberPhone: string;

//     @Field(() => String)
//     memberNick: string;

//     memberPassword?: string;

//     @Field(() => String, { nullable: true })
//     memberFullName?: string;

//     @Field(() => String)
//     memberImage?: string;

//     @Field(() => String, { nullable: true })
//     memberAddress?: string;

//     @Field(() => String, { nullable: true })
//     memberDesc?: string;

//     @Field(()=> Int)
//     memberProperties: number;

//      @Field(()=> Int)
//     memberFollowers: number;

//      @Field(()=> Int)
//     memberFollowings: number;

//      @Field(()=> Int)
//     memberPoints: number;

//      @Field(()=> Int)
//     memberLikes: number;

//      @Field(()=> Int)
//     memberViews: number;

//      @Field(()=> Int)
//     memberComments: number;

//      @Field(()=> Int)
//     memberRank: number;

//      @Field(()=> Int)
//     memberWarnings: number;

//      @Field(()=> Int)
//     memberBlocks: number;

//      @Field(()=> Date, {nullable: true})
//     deletedAt?: Date;

    
//      @Field(()=> Date)
//     createdAt?: Date;

     
//      @Field(()=> Date)
//     updateAt?: Date;
// }


// @ObjectType()
// export class View {
//     @Field(() => String)
//     _id: ObjectId;

    

//     @Field(() => Date, { nullable: true })
//     deletedAt?: Date;

//     @Field(() => Date, { nullable: true })
//     createdAt?: Date;

//     @Field(() => Date, { nullable: true })
//      ?: Date;

//     @Field(() => String, {nullable: true})
//     accessToken?: string;
// }

@ObjectType()
export class View {
    _id: ObjectId;

    @Field(() => ViewGroup)
    viewGroup: ViewGroup;

    @Field(() => String)
    viewRefId: ObjectId;

    @Field(() => String)
    memberId: ObjectId;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;
}
