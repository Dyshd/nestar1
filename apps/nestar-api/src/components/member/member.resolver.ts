import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { InternalServerErrorException, UsePipes, ValidationPipe } from '@nestjs/common';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';

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
    // @UsePipes(ValidationPipe)
    public async login(@Args("input") input: LoginInput): Promise<Member> {
            console.log("MUTATION LOGIN")
            return this.memberService.login(input);
        }

    

    @Mutation(() => String)
    public async updateMember(): Promise<string> {
        console.log("MUTATION updateMember")
        return this.memberService.updateMember();
    }
    @Query(() => String)
    public async getMember(): Promise<string> {
        console.log("MUTATION getMember")
        return this.memberService.getMember();
    }
}