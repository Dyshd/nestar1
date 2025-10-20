import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty } from "class-validator"
import { ViewGroup } from "../../enums/view.enum";

@InputType()
export class ViewInput {
    @IsNotEmpty()
    @Field(() => String)
    memberId: Object;

     @IsNotEmpty()
    @Field(() => String)
    viewRefId: Object;

     @IsNotEmpty()
    @Field(() => ViewGroup)
    viewGroup: ViewGroup;

}