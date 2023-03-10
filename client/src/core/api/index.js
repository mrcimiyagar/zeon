
import auth from './auth';
import call from './call';
import crypto from './crypto';
import file from './file';
import interactions from './interactions';
import invites from './invites';
import permissions from './permissions';
import spaces from './spaces';
import users from './users';
import shell from './shell';

let api = {
    auth,
    call,
    crypto,
    file,
    interactions,
    invites,
    permissions,
    spaces,
    users,
    shell
};

export default api;
