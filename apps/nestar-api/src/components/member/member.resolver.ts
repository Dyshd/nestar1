import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthService } from '../auth/auth.service';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import type { ObjectId } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class MemberResolver {
    constructor(private readonly memberService: MemberService) { }

    @Mutation(() => Member)
    // @UsePipes(ValidationPipe)
    public async signup(@Args("input") input: MemberInput): Promise<Member> {
        console.log("MUTATION SIGNUP")
        return this.memberService.signup(input);
    }

    @Mutation(() => Member)
    public async login(@Args("input") input: LoginInput): Promise<Member> {
        console.log("MUTATION LOGIN")
        return this.memberService.login(input);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => String)
    public async updateMember(@AuthMember('_id') memberId: ObjectId): Promise<string> {
        console.log("MUTATION updateMember")
        return this.memberService.updateMember();
    }

    @UseGuards(AuthGuard)
    @Mutation(() => String)
    public async checkAuth(@AuthMember('memberNick') memberNick: ObjectId): Promise<string> {
        console.log("Query :checkAuth")
        console.log('memberNick', memberNick)
        return `Hi ${memberNick}`;
    }
    @Roles(MemberType.USER, MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Mutation(() => String)
    public async checkAuthRolse(@AuthMember() authMember: Member): Promise<string> {
        console.log("Query :checkAuthRolse")
        return `Hi ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id})`;
    }

    @Query(() => String)
    public async getMember(): Promise<string> {
        console.log("MUTATION getMember")
        return this.memberService.getMember();
    }

    /** ADMIN **/

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => String)
    public async getAllMembersByAdmin(): Promise<string> {
        return this.memberService.getAllMembersByAdmin();
    }


    // Authorization: ADMIN
    @Mutation(() => String)
    public async updateMemberByAdmin(): Promise<string> {
        console.log('Mutation: updateMemberByAdmin');
        return this.memberService.updateMemberByAdmin();
    }

}