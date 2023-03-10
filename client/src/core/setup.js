
import React from 'react';
import { setupSocket } from './network/socket';
import { setupWebStomp } from './network/rabbitmq';
import { setupDB } from './storage/setup';
import { Component } from 'react';
import { MemoryWrapper } from './memory';
import Crypto from './crypto';

export class Core extends Component {
    started = false;
    memoryInitialValue = {};
    async loadCore() {
        if (!this.started) {
            this.started = true;
            setupDB();
            Crypto.setupCrypto();
            await setupWebStomp();
            setupSocket();
        }
    }
    constructor(props) {
        super(props);
        this.loadCore = this.loadCore.bind(this);
    }
    componentDidMount() {
        this.loadCore();
    }
    render() {
        return (
            <>
                <MemoryWrapper />
                {this.props.children}
            </>
        );
    }
};
