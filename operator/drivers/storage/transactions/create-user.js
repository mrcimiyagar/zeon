
const mongoose = require('mongoose');
let { Pending } = require('../schemas/schemas');
const { 
  v4: uuidv4,
} = require('uuid');
let { isEmpty } = require('../../../../shared/utils/strings');
const PendingFactory = require('../factories/pending-factory');
const InviteFactory = require('../factories/invite-factory');
const RoomFactory = require('../factories/room-factory');
const TowerFactory = require('../factories/tower-factory');
const MemberFactory = require('../factories/member-factory');
const UserFactory = require('../factories/user-factory');
const InteractionFactory = require('../factories/interaction-factory');
const { makeUniqueId } = require('../../../../shared/utils/id-generator');

const checkImports = () => {
  if (Pending === undefined) {
    Pending = require('../schemas/schemas').Pending;
  }
}

module.exports.dbCreateUser = async ({ email }) => {
  if (isEmpty(email)) {
    console.error('email can not be empty');
    return { success: false };
  }
  checkImports();
  const session = await mongoose.startSession();
  session.startTransaction();
  let pending;
  try {
    let success = false;
    pending = await PendingFactory.instance().find({ "email": email }, session);
    let vCode = '123', cCode = uuidv4();
    if (pending === null) {
      pending = await PendingFactory.instance().create({
        id: makeUniqueId(),
        email: email,
        clientCode: cCode,
        verificationCode: vCode,
        state: 0
      }, session);
      await session.commitTransaction();
      success = true;
    } else {
      if (pending.state < 1) {
        await PendingFactory.instance().update({email: email}, {clientCode: cCode, verificationCode: vCode}, session);
        await session.commitTransaction();
        success = true;
      } else {
        await PendingFactory.instance().update({email: email}, {clientCode: cCode, verificationCode: vCode, state: 0}, session);
        await session.commitTransaction();
        success = true;
      }
    }
    session.endSession();
    if (success) {
      return { success: true, clientCode: cCode };
    } else {
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
