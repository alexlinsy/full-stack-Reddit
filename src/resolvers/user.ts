import { User } from '../entities/User';
import { MyContext } from 'src/types';
import { Resolver, Mutation, InputType, Field, Arg, Ctx, ObjectType } from 'type-graphql';
import argon2 from 'argon2';

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string;
    @Field()
    password: string;
}

@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[]

    @Field(() => User, { nullable: true })
    user?: User
}

@Resolver()
export class UserResolver {
    @Mutation(() => UserResponse)
    async register(
        @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        if (options.username.length <= 2) {
            return {
                errors: [{
                    field: 'username',
                    message: 'Length should be greater than 2'
                }]
            }
        }
        if (options.password.length <= 3) {
            return {
                errors: [{
                    field: 'password',
                    message: 'Length should be greater than 3'
                }]
            }
        }
        const hashedPassword = await argon2.hash(options.password);
        const user = new User(options.username, hashedPassword);
        try {
            await em.persistAndFlush(user);
        } catch (error) {
            if (error.code === '23505' || error.detail.include('already exist')) {
                //duplicate username error
                return {
                    errors: [{
                        field: 'username',
                        message: 'username already taken'
                    }],
                }
            }
            console.log('message: ', error.message);
        }

        // store user id session
        // this will set a cookie on user
        // keep them login
        req.session!.userId = user.id;
        return { user, };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('options', () => UsernamePasswordInput) options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, { username: options.username });
        if (!user) {
            return {
                errors: [
                    {
                        field: 'username',
                        message: 'User name does not exist'
                    }
                ]
            }
        }
        const valid = argon2.verify(user.password, options.password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: 'password',
                        message: 'Incorrect password'
                    }
                ]
            }
        }

        req.session!.userId = user.id;

        return { user, }
    }
}