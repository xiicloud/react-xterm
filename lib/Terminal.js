'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _xterm = require('xterm');

var _xterm2 = _interopRequireDefault(_xterm);

require('xterm/addons/fit/fit');

require('xterm/addons/attach/attach');

require('xterm/addons/fullscreen/fullscreen');

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Terminal = function (_React$Component) {
  _inherits(Terminal, _React$Component);

  function Terminal(props) {
    _classCallCheck(this, Terminal);

    var _this = _possibleConstructorReturn(this, (Terminal.__proto__ || Object.getPrototypeOf(Terminal)).call(this, props));

    _this.term = new _xterm2.default({ cursorBlink: true });
    _this.path = props.socketURL || props.query.socketURL;
    _this.socket = _this.createSocket();
    _this.handleResize = _this.handleResize.bind(_this);
    return _this;
  }

  _createClass(Terminal, [{
    key: 'createSocket',
    value: function createSocket() {
      var _this2 = this;

      var onError = this.props.onError;

      var socket = (0, _socket2.default)({ path: this.path, reconnection: false });
      socket.on('error', function (err) {
        console.error('terminal socket error:', err);
        onError && onError();
        _this2.close();
      });
      socket.on('disconnect', function () {
        _this2.close();
        if (parent.window) {
          parent.window.postMessage('terminal:destroy', window.location.origin);
        }
        window.close();
      });
      return socket;
    }
  }, {
    key: 'close',
    value: function close() {
      this.term.destroy();
      this.socket.close();
    }
  }, {
    key: 'handleResize',
    value: function handleResize() {
      var _this3 = this;

      var size = this.viewport();
      this.socket.emit('resize', size.cols + ',' + size.rows, function () {
        return _this3.term.resize(size.cols, size.rows);
      });
    }
  }, {
    key: 'viewport',
    value: function viewport() {
      var terminalContainer = (0, _reactDom.findDOMNode)(this);
      var width = this.props.width || (terminalContainer ? terminalContainer.clientWidth : 0);
      var height = this.props.height || (terminalContainer ? terminalContainer.clientHeight : 0);
      return {
        cols: parseInt(width / 7, 10),
        rows: parseInt(height / 14, 10)
      };
    }
  }, {
    key: 'componentWillMount',
    value: function componentWillMount() {
      if (!this.path) {
        this.close();
      }
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      var terminalContainer = (0, _reactDom.findDOMNode)(this);
      var term = this.term;
      var socket = this.socket;

      var size = this.viewport();
      socket.emit('auth', 'terminal,' + size.cols + ',' + size.rows);
      term.open(terminalContainer);
      term.fit();
      this.props.query && term.toggleFullscreen();
      term.write('\x1b[32mWelcome to use cSphere online terminal!\x1b[m\r\n');
      term.on('data', function (data) {
        socket.emit('data', data);
      });

      socket.on('data', function (data) {
        term.write(data);
      });

      window.addEventListener('resize', this.handleResize);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.close();
      window.removeEventListener('resize', this.handleResize);
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement('div', { id: 'terminal-container' });
    }
  }]);

  return Terminal;
}(_react2.default.Component);

exports.default = Terminal;


Terminal.defaultProps = {
  width: 0,
  height: 0
};