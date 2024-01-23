'use server';

import { CreateUserParams, UpdateUserParams } from "@/types";
import { handleError } from "../utils";
import { connectToDatabase } from "../mongodb/database";
import User from "../mongodb/database/models/user.model";
import Order from "../mongodb/database/models/order.model";
import Event from "../mongodb/database/models/event.model";
import { revalidatePath } from "next/cache";
import { tgDebug } from "../utils";

export const createUser = async (user: CreateUserParams) => {

    try {
        await connectToDatabase();
        await tgDebug(JSON.stringify(user));
        const newUser = await User.create(user);
        await tgDebug(JSON.stringify(newUser));
        return JSON.parse(JSON.stringify(newUser));
    } catch (error) {
        handleError(error);
    }
}


export const getUserById = async (userId: string) => {
    try {
        await connectToDatabase();

        const user = await User.findById(userId);

        return JSON.parse(JSON.stringify(user));
    } catch (error) {
        handleError(error);
    }
}


export const updateUser = async (clerkId: string, user: UpdateUserParams) => {
    try {
        await connectToDatabase();

        const updatedUser = await User.findOneAndUpdate({ clerkId }, user, { new: true })

        if (!updatedUser) throw new Error('User update failed')
        return JSON.parse(JSON.stringify(updatedUser))

    } catch (error) {
        handleError(error);
    }
}

export const deleteUser = async (clerkId: string) => {
    try {
        await connectToDatabase();

        // Find user to delete
        const userToDelete = await User.findOne({ clerkId })

        if (!userToDelete) {
        throw new Error('User not found')
        }

        // // Unlink relationships
        // TODO REVISIT THIS LATER
        await Promise.all([
            // Update the 'events' collection to remove references to the user
            Event.updateMany(
                { _id: { $in: userToDelete.events } },
                { $pull: { organizer: userToDelete._id } }
            ),

            // Update the 'orders' collection to remove references to the user
            Order.updateMany({ _id: { $in: userToDelete.orders } }, { $unset: { buyer: 1 } }),
        ])

        // Delete user
        const deletedUser = await User.findByIdAndDelete(userToDelete._id)
        revalidatePath('/')

        return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null

    } catch (error) {
        handleError(error);
    }
}