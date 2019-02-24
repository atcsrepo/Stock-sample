const React = require('react');
const styles = require('./styles.js');

module.exports = class Title extends React.Component {
  render() {
    return (
      <div style={styles.head}>
        Recent Stock Trends
      </div>
    )
  }
}