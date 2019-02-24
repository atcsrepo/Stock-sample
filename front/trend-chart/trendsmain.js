const ReactDom = require('react-dom');
const React = require('react');
const styles = require('./styles.js');

const Title = require('./Title.js');
const Panel = require('./Panel.js');
const Control = require('./Control.js');
const Graph = require('./Graph.js');

module.exports = class App extends React.Component {
  constructor(props){
    super(props);
    
    this.state ={
      footerHeight: 10,
      resized: false
    };
    
    this.handleResize = this.handleResize.bind(this);
    this.footerHeight = this.footerHeight.bind(this);
  }
  
  footerHeight(){
    let footerHeight = window.getComputedStyle(document.getElementById("footer"), null)
                             .getPropertyValue("height");

    document.getElementById("trend-container").style.marginBottom = (parseInt(footerHeight) + 10) + "px";       
  }
  
  handleResize(){
    this.setState({resized: !this.state.resized});
  }
  
  componentDidMount(){
    window.requestAnimationFrame(this.footerHeight);
    window.addEventListener("resize", this.handleResize);
  }
  
  componentWillUnmount(){
    window.removeEventListener("resize", this.handleResize);
  }
  
  render(){
    let trendStyle;
    
    if (this.props.loading){
      trendStyle = Object.assign({}, styles.appContainer, {display: "none"});
    } else {
      trendStyle = Object.assign({}, styles.appContainer, {display: "block"});
    }
    
    return(
      <div style={trendStyle} id="trend-container">
        <Title />
        <Control newDateRange={this.props.getRange}
                 dateRange={this.props.dateRange}
                 setPeriod={this.props.setPeriod}
                 period={this.props.period}/>
        <Graph data={this.props.data}
               fHeight={this.footerHeight}
               resized={this.state.resized}
               nullResize={this.handleResize}/>
        <Panel tickers={this.props.tickers}
               getSearch={this.props.getSearch}
               error={this.props.error}
               fixError={this.props.getError}
               delReq={this.props.delRequest}/>
      </div>
    )
  }
}