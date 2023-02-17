
const mongoose = require('mongoose');
let { Tower, Room, Member, Workspace, User, Interaction } = require('../schemas/schemas');
let { isEmpty } = require('../../../global-utils/strings');
let defaultAvatars = require('../../../constants/avatars.json');
const permissions = require('../../../constants/permissions.json');
const updates = require('../../../constants/updates.json');
const { createServiceMessage, readMessages } = require('../../network/socket/events/messenger');
const { secureObject, secureAdmins } = require('../../../global-utils/filter');
const { getUser } = require('../../network/socket/pool');
const InviteFactory = require('../factories/invite-factory');
const RoomFactory = require('../factories/room-factory');
const TowerFactory = require('../factories/tower-factory');
const WorkspaceFactory = require('../factories/workspace-factory');
const MemberFactory = require('../factories/member-factory');
const UserFactory = require('../factories/user-factory');
const InteractionFactory = require('../factories/user-factory');
const { makeUniqueId } = require('../../../../shared/utils/id-generator');

const checkImports = () => {
    if (Tower === undefined) {
        Tower = require('../schemas/schemas').Tower;
    }
    if (Room === undefined) {
        Room = require('../schemas/schemas').Room;
    }
    if (Member === undefined) {
        Member = require('../schemas/schemas').Member;
    }
    if (Workspace === undefined) {
        Workspace = require('../schemas/schemas').Workspace;
    }
    if (User === undefined) {
        User = require('../schemas/schemas').User;
    }
    if (Interaction === undefined) {
        Interaction = require('../schemas/schemas').Interaction;
    }
}

module.exports.dbCreateInteraction = async ({ peerId }, userId, callback) => {
    if (isEmpty(peerId)) {
        console.error('peer id can not be empty');
        return { success: false };
    }
    checkImports();
    const session = await mongoose.startSession();
    session.startTransaction();
    let tower, room, member1, member2, workspace, interaction, user, me;
    try {
        user = (await UserFactory.instance().find({ id: peerId }, session)).toObject();
        if (user !== null) {
            interaction = await InteractionFactory.instance().find({ user1Id: userId, user2Id: peerId }, session);
            if (interaction === null) {
                interaction = await InteractionFactory.instance().find({ user2Id: userId, user1Id: peerId }, session);
            }
            if (interaction === null) {
                let workspaceGenedId = makeUniqueId();
                tower = await TowerFactory.instance().create({
                    id: makeUniqueId(),
                    title: '-',
                    avatarId: defaultAvatars.EMPTY_TOWER_AVATAR_ID,
                    isPublic: false,
                    secret: {
                        adminIds: [
                            userId,
                            peerId
                        ],
                        isContact: true
                    }
                }, session);
                room = await RoomFactory.instance().create({
                    id: makeUniqueId(),
                    title: 'hall',
                    avatarId: defaultAvatars.HALL_DEFAULT_AVATAR_ID,
                    floor: 'hall',
                    towerId: tower.id,
                    secret: {
                        adminIds: [
                            userId,
                            peerId
                        ],
                        defaultWorkspaceId: workspaceGenedId
                    }
                }, session);
                workspace = await WorkspaceFactory.instance().create({
                    id: workspaceGenedId,
                    title: 'main workspace',
                    roomId: room.id
                }, session);
                member1 = await MemberFactory.instance().create({
                    id: makeUniqueId(),
                    userId: userId,
                    roomId: room.id,
                    towerId: tower.id,
                    secret: {
                        permissions: permissions.DEFAULT_ROOM_ADMIN_PERMISSIONS
                    }
                }, session);
                member2 = await MemberFactory.instance().create({
                    id: makeUniqueId(),
                    userId: peerId,
                    roomId: room.id,
                    towerId: tower.id,
                    secret: {
                        permissions: permissions.DEFAULT_ROOM_ADMIN_PERMISSIONS
                    }
                }, session);
                interaction = await InteractionFactory.instance().create({
                    id: makeUniqueId(),
                    user1Id: userId,
                    user2Id: peerId,
                    roomId: room.id,
                    towerId: tower.id,
                }, session);
                me = (await UserFactory.instance().find({ id: userId })).toObject();
                await session.commitTransaction();
                session.endSession();
                //createServiceMessage({ roomId: room.id, workspaceId: workspace.id, text: 'room created.' }, async response => {
                //    if (response.status === 1) {
                //        let serviceMessage = response.message;
                        callback({
                            noAction: false,
                            success: true,
                            update: {
                                type: updates.NEW_INTERACTION,
                                tower,
                                room,
                                member1,
                                member2,
                                workspace,
                                interaction,
                                contact: secureObject(me, 'secret'),
                                userId: peerId,
                                messages: []//[serviceMessage]
                            },
                            tower,
                            room,
                            member1,
                            member2,
                            workspace,
                            interaction,
                            contact: secureObject(user, 'secret'),
                            messages: []//[serviceMessage],
                        });
                //    }
                //});
            } else {
                await session.abortTransaction();
                session.endSession();
                tower = await TowerFactory.instance().find({ id: interaction.towerId }, session);
                room = await RoomFactory.instance().find({ id: interaction.roomId }, session);
                member1 = await MemberFactory.instance().find({ roomId: room.id, userId: interaction.user1Id }, session);
                member2 = await MemberFactory.instance().find({ roomId: room.id, userId: interaction.user2Id }, session);
                workspace = await WorkspaceFactory.instance().find({ roomId: room.id });
                user = (await UserFactory.instance().find({ id: peerId }, session)).toObject();
                me = (await UserFactory.instance().find({ id: userId }, session)).toObject();
                //readMessages({ userId: userId, roomId: room.id, workspaceId: workspace.id }, async response => {
                //    if (response.status === 1) {
                //        let messages = response.messages;
                        callback({
                            noAction: true,
                            success: true,
                            existed: true,
                            update: {
                                type: updates.NEW_INTERACTION,
                                tower,
                                room,
                                member1,
                                member2,
                                workspace,
                                interaction, 
                                contact: secureObject(me, 'secret'),
                                userId: peerId,
                                messages: []//JSON.parse(messages)
                            },
                            tower,
                            room,
                            member1,
                            member2,
                            workspace,
                            interaction,
                            contact: secureObject(user, 'secret'),
                            messages: []//JSON.parse(messages)
                        });
                //    }
                //});
            }
        } else {
            console.error('peer does not exist');
            console.error('abort transaction');
            await session.abortTransaction();
            session.endSession();
            return { success: false };
        }
    } catch (error) {
        console.error(error);
        console.error('abort transaction');
        await session.abortTransaction();
        session.endSession();
        return { success: false };
    }
};
