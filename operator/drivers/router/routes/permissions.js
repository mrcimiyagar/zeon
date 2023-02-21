
const { dbCreateInvite } = require('../../storage/transactions/create-invite');
const { dbCancelInvite } = require('../../storage/transactions/cancel-invite');
const { dbAcceptInvite } = require('../../storage/transactions/accept-invite');
const { dbDeclineInvite } = require('../../storage/transactions/decline-invite');
const errors = require('../../../../constants/errors.json');
const { dbModifyPermissions } = require('../../storage/transactions/modify-permissions');
const { dbFetchPermissions } = require('../../storage/transactions/fetch-permissions');

module.exports.attachPermissionsEvents = (socket) => {
    socket.on('modifyPermissions', async (data) => {
        if (socket.user !== undefined) {
            let { success, update } = await dbModifyPermissions(data, socket.user.id);
            if (success) {
                let targetSocket = getSocket(data?.targetUserId)?.rawSocket;
                if (targetSocket?.roomId === data?.roomId) {
                    targetSocket.rights = data.permissions;
                }
                socket.reply(data.replyTo, { status: 1 });
                handleUpdate(update);
            } else {
                socket.reply(data.replyTo, { status: 2, errorText: errors.DATABASE_ERROR });
            }
        }
    });
    socket.on('fetchPermissions', async (data) => {
        if (socket.user !== undefined) {
            let { success, permissions } = await dbFetchPermissions(data, socket.user.id);
            if (success) {
                socket.reply(data.replyTo, { status: 1, permissions: permissions });
            } else {
                socket.reply(data.replyTo, { status: 2, errorText: errors.DATABASE_ERROR });
            }
        }
    });
}
