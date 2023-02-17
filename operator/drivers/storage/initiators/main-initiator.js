const { putUser, join, putRoom, indexWorkspace } = require('../../network/socket/pool');
const { connectMongoClient } = require('../drivers/main-driver');
const { defineSchemas } = require('../schemas/schemas');
const { runUpdater, setupUserUpdater } = require('../update-engine/update-engine');
const { createTower } = require('../transactions/create-tower');

module.exports.setupDatabase = async () => {
    connectMongoClient();
    defineSchemas();
    const { User, Member, Room, Workspace, Tower } = require('../schemas/schemas');
    let rooms = await Room.find({}).exec();
    rooms.forEach(room => putRoom(room));
    let users = await User.find({}).exec();
    users.forEach(async user => {
        putUser(user);
        let memberships = await Member.find({ userId: user.id }).exec();
        memberships.forEach(membership => {
            join(user.id, membership.roomId);
        });
        setupUserUpdater(user.id);
    });
    let workspaces = await Workspace.find({}).exec();
    if (workspaces.length > 0) {
        workspaces.forEach(workspace => {
            indexWorkspace(workspace);
        });
        module.exports.centralTower = await Tower.findOne({ id: 'CENTRAL_TOWER' }).exec();
        module.exports.centralTowerHall = await Room.findOne({ towerId: 'CENTRAL_TOWER' }).exec();
    } else {
        let workspace = await Workspace.create([{
            title: 'main workspace',
            roomId: ''
        }]);
        workspace = workspace[0];
        let room = await Room.create([{
            title: 'hall',
            avatarId: 'help',
            floor: 'hall',
            secret: {
                adminIds: [
                    '0'
                ],
                defaultWorkspaceId: workspace._id.toHexString()
            }
        }]);
        room = room[0];
        let tower = await Tower.create([{
            title: 'Central Tower',
            avatarId: 'help',
            isPublic: true,
            secret: {
                adminIds: [
                    '0'
                ]
            }
        }]);
        tower = tower[0];
        await Tower.updateOne({ _id: tower._id }, { id: 'CENTRAL_TOWER' });
        tower = await Tower.findOne({ id: 'CENTRAL_TOWER' }).exec();
        await Room.updateOne({ _id: room._id }, { id: room._id.toHexString(), towerId: tower.id });
        room = await Room.findOne({ id: room._id.toHexString() }).exec();
        await Workspace.updateOne({ _id: workspace._id }, { id: workspace._id.toHexString(), roomId: room.id });
        workspace = await Workspace.findOne({ id: workspace._id.toHexString() }).exec();

        putRoom(room);

        module.exports.centralTower = tower;
        module.exports.centralTowerHall = room;
    }
    runUpdater();
}