/**
 * This module provides methods for attaching a terminal to a csphere WebSocket stream.
 *
 * @module xterm/addons/csphere/csphere
 * @license MIT
 */

(function (attach) {
    if (typeof exports === 'object' && typeof module === 'object') {
        /*
         * CommonJS environment
         */
        module.exports = attach(require('xterm/dist/xterm.js'));
    } else if (typeof define === 'function') {
        /*
         * Require.js is available
         */
        define(['xterm'], attach);
    } else {
        /*
         * Plain browser environment
         */
        attach(window.Terminal);
    }
})(function (Xterm) {
    'use strict';

    var exports = {};

    // The following consts must be align with those in the server side.
    var stdin = '0', stdout = '1', stderr = '2', set_size = '3';

    /**
     * Attaches the given terminal to the given socket.
     *
     * @param {Xterm} term - The terminal to be attached to the given socket.
     * @param {WebSocket} socket - The socket to attach the current terminal.
     * @param {boolean} bidirectional - Whether the terminal should send data
     *                                  to the socket as well.
     * @param {boolean} buffered - Whether the rendering of incoming data
     *                             should happen instantly or at a maximum
     *                             frequency of 1 rendering per 10ms.
     */
    exports.csphereAttach = function (term, socket, bidirectional, buffered) {
        bidirectional = (typeof bidirectional === 'undefined') ? true : bidirectional;
        term.socket = socket;

        term._flushBuffer = function () {
            term.write(term._attachSocketBuffer);
            term._attachSocketBuffer = null;
            clearTimeout(term._attachSocketBufferTimer);
            term._attachSocketBufferTimer = null;
        };

        term._pushToBuffer = function (data) {
            if (term._attachSocketBuffer) {
                term._attachSocketBuffer += data;
            } else {
                term._attachSocketBuffer = data;
                setTimeout(term._flushBuffer, 10);
            }
        };

        term._getMessage = function (ev) {
            var type = ev.data[0];
            var data = ev.data.substring(1);
            if (type === stderr) {
                data = '\n\x1b[31mError: ' + data + '\x1b[0m\n';
            }

            if (buffered) {
                term._pushToBuffer(data);
            } else {
                term.write(data);
            }
        };

        term._sendData = function (data) {
            socket.send(stdin + data);
        };

        term._setSize = function (size) {
            socket.send(set_size + size.cols + '|' + size.rows);
        };

        socket.addEventListener('message', term._getMessage);

        if (bidirectional) {
            term.on('data', term._sendData);
        }
        term.on('resize', term._setSize);

        socket.addEventListener('close', term.csphereDetach.bind(term, socket));
        socket.addEventListener('error', term.csphereDetach.bind(term, socket));
    };

    /**
     * Detaches the given terminal from the given socket
     *
     * @param {Xterm} term - The terminal to be detached from the given socket.
     * @param {WebSocket} socket - The socket from which to detach the current
     *                             terminal.
     */
    exports.csphereDetach = function (term, socket) {
        term.off('data', term._sendData);

        socket = (typeof socket === 'undefined') ? term.socket : socket;

        if (socket) {
            socket.removeEventListener('message', term._getMessage);
        }

        delete term.socket;
    };

    /**
     * Attaches the current terminal to the given socket
     *
     * @param {WebSocket} socket - The socket to attach the current terminal.
     * @param {boolean} bidirectional - Whether the terminal should send data
     *                                  to the socket as well.
     * @param {boolean} buffered - Whether the rendering of incoming data
     *                             should happen instantly or at a maximum
     *                             frequency of 1 rendering per 10ms.
     */
    Xterm.prototype.csphereAttach = function (socket, bidirectional, buffered) {
        return exports.csphereAttach(this, socket, bidirectional, buffered);
    };

    /**
     * Detaches the current terminal from the given socket.
     *
     * @param {WebSocket} socket - The socket from which to detach the current
     *                             terminal.
     */
    Xterm.prototype.csphereDetach = function (socket) {
        return exports.csphereDetach(this, socket);
    };

    return exports;
});
