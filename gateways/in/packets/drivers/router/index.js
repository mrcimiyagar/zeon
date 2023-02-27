
let auth = require('./routes/auth');

const attachRoute = (socket, socketManager, route) => {
    for (let routeKey in route) {
        socket.on(routeKey, data => {
            route[routeKey](socket, data, socketManager);
        });
    }
};

module.exports = {
    attachRoute: attachRoute,
    attachRouter: (socket, socketManager) => {
        attachRoute(socket, socketManager, auth);
    }
}
