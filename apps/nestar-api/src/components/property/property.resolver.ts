import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { PropertyService } from './property.service';
import { Properties, Property } from '../../libs/dto/property/property';
import { AgentPropertiesInquiry, AllPropertiesInquiry, OrdinaryInquiry, PropertiesInquiry, PropertyInput } from '../../libs/dto/property/property.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as mongoose from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { UseGuards } from '@nestjs/common';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { MemberInput } from '../../libs/dto/member/member.input';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class PropertyResolver {
    constructor(private readonly propertyService: PropertyService) { } // ✅ to‘g‘ri nom

    @Roles(MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Mutation(() => Property)
    public async createProperty(
        @Args('input') input: PropertyInput,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Property> {
        console.log('Mutation createProperty');

        input.memberId = memberId;
        return await this.propertyService.createProperty(input); // ✅ to‘g‘ri obyekt
    }

    @UseGuards(WithoutGuard)
    @Query((returns) => Property)
    public async getProperty(
        @Args('propertyId') input: string,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Property> {
        console.log('Query: getProperty');
        const propertyId = shapeIntoMongoObjectId(input);
        return await this.propertyService.getProperty(memberId, propertyId);
    }

    @Roles(MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Mutation(() => Property)
    public async updateProperty(
        @Args('input') input: PropertyUpdate,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Property> {
        console.log('Mutation: updateProperty');
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.propertyService.updateProperty(memberId, input);
    }


    @UseGuards(WithoutGuard)
    @Query(() => Properties)
    public async getProperties(
        @Args('input') input: PropertiesInquiry,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Properties> {
        console.log('Mutation: getProperties');
        return await this.propertyService.getProperties(memberId, input);
    }

    @UseGuards(AuthGuard)
    @Query((returns) => Properties)
    public async getFavorites(
        @Args('input') input: OrdinaryInquiry,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Properties> {
        console.log('Mutation: getFavorites');
        return await this.propertyService.getFavorites(memberId, input);
    }

    @UseGuards(AuthGuard)
    @Query((returns) => Properties)
    public async getVisited(
        @Args('input') input: OrdinaryInquiry,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Properties> {
        console.log('Mutation: getVisited');
        return await this.propertyService.getVisited(memberId, input);
    }

    @Roles(MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Query((returns) => Properties)
    public async getAgentProperties(
        @Args('input') input: AgentPropertiesInquiry,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Properties> {
        console.log('Query: getAgentProperties');
        return await this.propertyService.getAgentProperties(memberId, input);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Property)
    public async likeTargetProperty(
        @Args('propertyId') input: string,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Property> {
        console.log('Mutation: likeTargetProperty');
        const likeRefId = shapeIntoMongoObjectId(input);
        console.log("likeRefId:", likeRefId)
        return await this.propertyService.likeTargetProperty(memberId, likeRefId);
    }


    // Admin

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Query((returns) => Properties)
    public async getAllPropertiesByAdmin(
        @Args('input') input: AllPropertiesInquiry,
        @AuthMember('_id') memberId: mongoose.ObjectId,
    ): Promise<Properties> {
        console.log('Query: getAllPropertiesByAdmin');
        return await this.propertyService.getAllPropertiesByAdmin(memberId, input);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation((returns) => Property)
    public async updatePropertyByAdmin(@Args('input') input: PropertyUpdate): Promise<Property> {
        console.log('Mutation: updatePropertyByAdmin');
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.propertyService.updatePropertyByAdmin(input);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation((returns) => Property)
    public async removePropertyByAdmin(@Args('propertyId') input: string): Promise<Property> {
        console.log('Mutation: removePropertyByAdmin');
        const propertyId = shapeIntoMongoObjectId(input);
        return await this.propertyService.removePropertyByAdmin(propertyId);
    }




}


