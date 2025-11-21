import { Field, ObjectType } from '@nestjs/graphql';
import { Member } from '../member/member';
import { MeLiked } from '../like/like';
import { TotalConter } from '../member/member'; 

@ObjectType()
export class MeFollowed {
  @Field(() => String)
  followingId: string;   // ❗ string bo‘lishi shart

  @Field(() => String)
  followerId: string;

  @Field(() => Boolean)
  myFollowing: boolean;
}

@ObjectType()
export class Follower {
  @Field(() => String)
  _id: string;

  @Field(() => String)
  followingId: string;

  @Field(() => String)
  followerId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  /** from aggregation **/

  @Field(() => [MeLiked], { nullable: true })
  meLiked?: MeLiked[];

  @Field(() => [MeFollowed], { nullable: true })
  meFollowed?: MeFollowed[];

  @Field(() => Member, { nullable: true })
  followerData?: Member;
}

@ObjectType()
export class Following {
  @Field(() => String)
  _id: string;

  @Field(() => String)
  followingId: string;

  @Field(() => String)
  followerId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  /** aggregation **/

  @Field(() => [MeLiked], { nullable: true })
  meLiked?: MeLiked[];

  @Field(() => [MeFollowed], { nullable: true })
  meFollowed?: MeFollowed[];

  @Field(() => Member, { nullable: true })
  followingData?: Member;
}

@ObjectType()
export class Followings {
  @Field(() => [Following])
  list: Following[];

  @Field(() => [TotalConter], { nullable: true })
  metaCounter: TotalConter[];
}

@ObjectType()
export class Followers {
  @Field(() => [Follower])
  list: Follower[];

  @Field(() => [TotalConter], { nullable: true })
  metaCounter: TotalConter[];
}
