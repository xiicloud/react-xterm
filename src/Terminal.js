import React from 'react';
import {findDOMNode} from 'react-dom';
import Xterm from 'xterm/dist/xterm.js';
import 'xterm/dist/addons/fit/fit.js';
import './addons/attach.js';

export default class Terminal extends React.Component {
  static propTypes = {
    socketURL: React.PropTypes.string.isRequired,
    onError: React.PropTypes.func,
    onClose: React.PropTypes.func,
    title: React.PropTypes.string,
  }

  constructor(props) {
    super(props);
    this.term = new Xterm({cursorBlink: true});
    this.handleResize = this.handleResize.bind(this);
  }

  handleResize() {
    this.term.fit();
  }

  close() {
    this.term.destroy();
    this.socket.close();
  }

  componentWillMount() {
    const {onClose, socketURL} = this.props;
    if (!socketURL) {
      onClose && onClose();
      this.close();
    }
  }

  createSocket(socketURL: string, onClose: Function) {
    this.socket = new WebSocket(`${socketURL}?dim=${this.cols}|${this.rows}`);
    this.socket.onopen = () => {
      this.term.write(this.props.title);
      this.term.csphereAttach(this.socket);
      this.term.fit();
    };
    this.socket.onclose = () => {
      onClose();
    };
  }

  componentDidMount() {
    const terminalContainer = findDOMNode(this);
    this.term.open(terminalContainer);
    const {cols, rows} = this.term.proposeGeometry();
    this.cols = cols;
    this.rows = rows;
    this.createSocket(this.props.socketURL, this.props.onClose);
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    this.close();
    window.removeEventListener('resize', this.handleResize);
  }

  componentWillReceiveProps(nextProps) {
    const {socketURL} = this.props;
    if (socketURL !== nextProps.socketURL) {
      this.socket.close();
      this.term.reset();
      this.createSocket(nextProps.socketURL, nextProps.onClose);
    }
  }

  render() {
    return (
      <div id="terminal-container" />
    );
  }
}

Terminal.defaultProps = {
  title: '\x1b[32mWelcome to use online terminal!\x1b[m\r\n'
};
