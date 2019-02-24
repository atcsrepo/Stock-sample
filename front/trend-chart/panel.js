const React = require('react');
const styles = require('./styles.js');

module.exports = class Panel extends React.Component {
  constructor(props){
    super(props);
    
    this.state= {
      panels: [],
      index: 0,
      msg: '',
    };
    
    this.add = this.add.bind(this);
    this.addPanel = this.addPanel.bind(this);
    this.delHandler = this.delHandler.bind(this);
    this.panelMouseLeave= this.panelMouseLeave.bind(this);
    this.panelMouseEnter = this.panelMouseEnter.bind(this);
    this.delMouseEnter = this.delMouseEnter.bind(this);
    this.delMouseLeave = this.delMouseLeave.bind(this);
    this.checkKey = this.checkKey.bind(this);
  }
  
  delMouseEnter(e){
    var id = e.target.id;
    
    document.getElementById(id).style.fontSize ='1.3rem';
    document.getElementById(id).style.color ='red';
  }
  
  delMouseLeave(e){
    var id = e.target.id;

    document.getElementById(id).style.fontSize ='1.1rem';
    document.getElementById(id).style.color ='#B0BEC5';
  }
  
  panelMouseLeave(e){
    var id = e.currentTarget.id;
        
    document.getElementById(id).style.backgroundColor = '#006600';
  }
  
  panelMouseEnter(e){
    var id = e.currentTarget.id;
   
    document.getElementById(id).style.backgroundColor = '#DCEDC8';
  }
  
  addPanel(tickers){

    var panels = [];
    
    for (var i = 0; i < tickers.length; i++){
      panels.push(
        <div style={styles.panelContainer} key={tickers[i] + 'P'}        
             onMouseEnter={this.panelMouseEnter} 
             onMouseLeave={this.panelMouseLeave}
             id={tickers[i]+'C'}>
          <div style={styles.panel}>
            <div style={styles.delButton} />
            <div style={styles.panelBody}>
              {tickers[i]}
            </div>
            <div style={styles.delButton} 
                 onClick={this.delHandler}
                 onMouseEnter={this.delMouseEnter} 
                 onMouseLeave={this.delMouseLeave}
                 id={tickers[i]}>
              X
            </div>
          </div>
        </div>
      )
    };
    
    return panels;
  }
  
  add(){
    var query = document.getElementById('tickerSym').value;
    this.props.getSearch(query);
    this.props.fixError('Fetching Data. Please wait.');                   
    document.getElementById('tickerSym').value = '';
  }
  
  delHandler(e){
    var id = e.target.id;
    this.props.delReq(id);
  }  
  
  checkKey(e){
    if(e.key == 'Enter'){
      this.add();
    } 
  }
  
  componentDidUpdate(){
    if (this.state.msg != this.props.error) {
      this.setState({msg: this.props.error});
    }
  }
  
  render() {
    return (
      <div style={styles.displayDiv}>
        {this.addPanel(this.props.tickers)}
        <div style={styles.addContainer}>
          <div style={styles.addStock}>
            <p style={{lineHeight: '0', marginTop:'2px'}}>Syncs across browsers</p>
            <input style={styles.addInput} 
              placeholder="Ticker Symbol" 
              onKeyPress={this.checkKey} 
              id="tickerSym"/>
            <button style={styles.addButton} onClick={this.add}>Add</button>
            <p style={{lineHeight: '0', marginBottom:'2px'}}>{this.state.msg}</p>
          </div>
        </div>
        <div style={styles.ghost}/>
        <div style={styles.ghost}/>
        <div style={styles.ghost}/>
        <div style={styles.ghost}/>
        <div style={styles.ghost}/>
      </div>
    )
  }
}


