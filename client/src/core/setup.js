
import { setupSocket } from './network/socket';
import { setupDB } from './storage/setup';
import { Component } from 'react';
import { setupMemory, StateContext } from './memory';

export class Core extends Component {
    started = false;
    memoryInitialValue = {};
    async loadCore() {
        if (!this.started) {
            this.started = true;
            setupDB();
            this.memoryInitialValue = await setupMemory();
            setupSocket();
        }
    }
    constructor(props) {
        super(props);
        this.loadCore = this.loadCore.bind(this);
        this.loadCore();
    }
    render() {
        return (
            <StateContext.Provider value={this.memoryInitialValue}>
                {this.props.children}
            </StateContext.Provider>
        );
    }
};
