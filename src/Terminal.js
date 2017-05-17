import React from 'react';
import {findDOMNode} from 'react-dom';
import Xterm from 'xterm/dist/xterm.js';
import 'xterm/dist/addons/fullscreen/fullscreen.js';
import io from 'socket.io-client/socket.io.js';

export default class Terminal extends React.Component {
  static propTypes = {
    socketURL: React.PropTypes.string.isRequired,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    onError: React.PropTypes.func,
    onClose: React.PropTypes.func,
    title: React.PropTypes.string,
    initialEmit: React.PropTypes.array,
    fullscreen: React.PropTypes.bool,
    fontSize: React.PropTypes.number
  }

  constructor(props) {
    super(props);
    this.term = new Xterm({cursorBlink: true});
    this.socket = this.createSocket(props.socketURL);
    this.handleResize = this.handleResize.bind(this);
    this.width = props.width;
    this.height = props.height;
    this.isChange = false;
  }

  createSocket(path) {
    const {onError, onClose, initialEmit, title} = this.props;
    const term = this.term;
    const socket = io({path, reconnection: false, forceNew: true});
    this.isChange = false;
    socket.on('connect', () => {
      socket.emit(initialEmit[0], initialEmit[1]);
      term.write(title);
    });
    socket.on('error', (err) => {
      term.write(`\x1b[31mError:${err}\x1b[m\r\n`);
      onError && onError();
    });
    socket.on('disconnect', () => {
      if (!this.isChange) {
        onClose && onClose();
      }
    });
    socket.on('data', (data) => {
      term.write(data);
    });
    term.on('data', (data) => {
      socket.emit('data', data);
    });
    return socket;
  }

  close() {
    this.term.destroy();
    this.socket.close();
  }

  handleResize() {
    const size = this.viewport();
    this.socket.emit('resize', `${size.cols},${size.rows}`,
      () => this.term.resize(size.cols, size.rows));
  }

  viewport() {
    const terminalContainer = findDOMNode(this);
    const width = this.width || (terminalContainer ? terminalContainer.querySelector('.terminal').clientWidth : 0);
    const terminalHeight = terminalContainer ? terminalContainer.clientHeight : 0;
    const height = this.height || (this.props.fullscreen ? document.documentElement.clientHeight : terminalHeight);
    const fontSize = this.props.fontSize;

    return {
      cols: parseInt(width / 7, 10),
      rows: parseInt((height - fontSize) / fontSize, 10)
    };
  }

  componentWillMount() {
    const {onClose, socketURL} = this.props;
    if (!socketURL) {
      onClose && onClose();
      this.close();
    }
  }

  componentDidMount() {
    const terminalContainer = findDOMNode(this);
    const {term} = this;
    term.open(terminalContainer);
    this.props.fullscreen && term.toggleFullscreen();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    this.close();
    window.removeEventListener('resize', this.handleResize);
  }

  componentWillReceiveProps(nextProps) {
    const {socketURL, width, height} = this.props;
    if (socketURL !== nextProps.socketURL) {
      this.isChange = true;
      this.term.reset();
      this.socket.close();
      this.socket = this.createSocket(nextProps.socketURL);
      this.handleResize();
    }
    if (width !== nextProps.width || height !== nextProps.height) {
      this.width = nextProps.width;
      this.height = nextProps.height;
      this.handleResize();
    }
  }

  render() {
    return (
      <div id="terminal-container" />
    );
  }
}

Terminal.defaultProps = {
  width: 0,
  height: 0,
  title: '\x1b[32mWelcome to use cSphere online terminal!\x1b[m\r\n',
  initialEmit: ['auth', 'terminal,50,20'],
  fullscreen: false,
  fontSize: 14
};
