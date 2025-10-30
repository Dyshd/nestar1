import { Args, Mutation, Resolver,Query } from '@nestjs/graphql';
import { PropertyService } from './property.service';
import { Property } from '../../libs/dto/property/property';
import { PropertyInput } from '../../libs/dto/property/property.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as mongoose from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { UseGuards } from '@nestjs/common';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class PropertyResolver {
  constructor(private readonly propertyService: PropertyService) {} // ✅ to‘g‘ri nom

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

}


