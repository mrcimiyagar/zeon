
const mongoose = require('mongoose');
let { Pending, User, Session, Member, Tower, Room, Workspace, Interaction } = require('../schemas/schemas');
const {
    v4: uuidv4,
} = require('uuid');
const jwt = require('jsonwebtoken');
const SessionFactory = require('../factories/session-factory');
const PendingFactory = require('../factories/pending-factory');
const InviteFactory = require('../factories/invite-factory');
const RoomFactory = require('../factories/room-factory');
const TowerFactory = require('../factories/tower-factory');
const WorkspaceFactory = require('../factories/workspace-factory');
const MemberFactory = require('../factories/member-factory');
const UserFactory = require('../factories/user-factory');
const InteractionFactory = require('../factories/user-factory');
const { makeUniqueId } = require('../../../../shared/utils/id-generator');

const checkImports = () => {
    if (Pending === undefined) {
        Pending = require('../schemas/schemas').Pending;
    }
    if (User === undefined) {
        User = require('../schemas/schemas').User;
    }
    if (Session === undefined) {
        Session = require('../schemas/schemas').Session;
    }
    if (Tower === undefined) {
        Tower = require('../schemas/schemas').Tower;
    }
    if (Room === undefined) {
        Room = require('../schemas/schemas').Room;
    }
    if (Workspace === undefined) {
        Workspace = require('../schemas/schemas').Workspace;
    }
    if (Member === undefined) {
        Member = require('../schemas/schemas').Member;
    }
    if (Interaction === undefined) {
        Interaction = require('../schemas/schemas').Interaction;
    }
}

module.exports.dbVerifyUser = async ({ auth0AccessToken }) => {
    checkImports();
    const session = await mongoose.startSession();
    session.startTransaction();
    const inputData = JSON.parse(Buffer.from(auth0AccessToken.split('.')[1], 'base64').toString());
    let email = inputData['https://internal.cosmopole.cloud/email'];
    let pending, userSession, user;
    try {
        pending = await PendingFactory.instance().find({ email: email }, session);
        if (pending !== null) {
            user = await UserFactory.instance().find({ id: pending.userId }, session);
            if (user !== null) {
                userSession = await SessionFactory.instance().create({
                    id: makeUniqueId(),
                    token: uuidv4(),
                    userId: user.id
                }, session);
                await UserFactory.instance().update({ id: user.id }, { $push: { sessionIds: userSession.id } }, session);
                user = await UserFactory.instance().findOne({ id: user._id.toHexString() }, session);
                let memberships = await MemberFactory.instance().findGroup({ userId: user.id }, session);
                let towers = await TowerFactory.instance().findGroup({ 'id': { $in: memberships.map(m => m.towerId) } }, session);
                let rooms = await RoomFactory.instance().findGroup({ 'id': { $in: memberships.map(m => m.roomId) } }, session);
                let allMemberships = await MemberFactory.instance().findGroup({ roomId: { $in: rooms.map(r => r.id) } }, session);
                let workspaces = await WorkspaceFactory.instance().findGroup({ 'roomId': { $in: rooms.map(r => r.id) } }, session);
                let interactions = await InteractionFactory.instance().findGroup({ $or: [{ user1Id: user.id }, { user2Id: user.id }] }, session);
                towers.forEach(tower => {
                    if (tower.secret.isContact) {
                        let user1Id = tower.secret.adminIds[0];
                        let user2Id = tower.secret.adminIds[1];
                        let target = (user1Id === user.id) ? user2Id : user1Id;
                        tower.contactId = target;
                        tower.contact = getUser(target);
                    }
                });
                //let storageData = await readUserStorageData(user.id);
                //let documentsData = await readUserDocumentsData(user.id);
                //let blogsData = await readUserBlogsData(user.id);
                await session.commitTransaction();
                session.endSession();
                return {
                    success: true,
                    session: userSession,
                    user: user,
                    towers: towers,
                    rooms: rooms,
                    workspaces: workspaces,
                    myMemberships: memberships,
                    allMemberships: allMemberships,
                    interactions: interactions,
                    filespaces: [],//storageData.filespaces,
                    disks: [],//storageData.disks,
                    folders: [],//storageData.folders,
                    files: [],//storageData.files,
                    documents: [],//documentsData.documents,
                    blogs: [],//blogsData.blogs,
                    posts: []// blogsData.posts
                };
            } else {
                await session.commitTransaction();
                session.endSession();
                return { success: true };
            }
        } else {
            await session.commitTransaction();
            session.endSession();
            return { success: true };
        }
    } catch (error) {
        console.error(error);
        console.error('abort transaction');
        await session.abortTransaction();
        session.endSession();
        return { success: false };
    }
}
