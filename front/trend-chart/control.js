const React = require('react');
const moment = require('moment');
const styles = require('./styles.js');

module.exports = class Control extends React.Component {
  
  constructor(props){
    super(props);
    
    this.state = {
      from: '',
      to: ''
    };
    
    this.clickHandler = this.clickHandler.bind(this);
    this.parseReq = this.parseReq.bind(this);
    this.submitEntry = this.submitEntry.bind(this);
    this.submitBlur = this.submitBlur.bind(this);
    this.changeTo = this.changeTo.bind(this);
    this.changeFrom = this.changeFrom.bind(this);
  }
    
  clickHandler(e) {
    var id = e.target.id;
    var date = new Date;
   
    var parsedDate = date.toLocaleDateString();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var startMonth = month;
    var startYear = year;
    var startDate = date.getDate();
    var date = date.getDate();
    
    switch (id) {
      case "b1m":
        startMonth -= 1;

        if (startMonth <= 0) {
          startYear -= 1;
        };

        break;
      case "b3m":
        startMonth -= 3; 
        
        if (startMonth <= 0) {
          startYear -= 1;
        };
        
        break;
      case "b6m":
        startMonth -= 6;
        
        if (startMonth <= 0) {
          startYear -= 1;
        };
        
        break;
      case "bytd":
        startMonth = 1;
        startDate = 1;
        break;
      case "b1y":
        startMonth -= 12;
        
        if (startMonth <= 0) {
          startYear -= 1;
        }
        
        break;
    }
    
    if (startMonth <= 0 ){
      startMonth += 12;
    }
    
    startMonth = (startMonth < 10) ? ('0' + startMonth) : startMonth;
    startDate = (startDate < 10) ? ('0' + startDate) : startDate;
    month = (month < 10) ? ('0' + month) : month;
    date = (date < 10) ? ('0' + date) : date;

    var startDateString = startYear +'-'+ startMonth +'-'+ startDate;
    var endDateString = year +'-'+ (month) +'-'+ date;
    this.props.newDateRange({start: startDateString, end: endDateString});
    this.props.setPeriod(id);
  }  
  
  setColors(id){
    const buttonIDs = ['b1m', 'b3m', 'b6m', 'bytd', 'b1y'];
    
    for (var i = 0; i < buttonIDs.length; i++){
      if (buttonIDs[i] == id){
        document.getElementById(id).style.background = 'black';
        document.getElementById(id).style.color = 'white';
      } else {
        document.getElementById(buttonIDs[i]).style.background = 'white';
        document.getElementById(buttonIDs[i]).style.color = 'black';
      };
    };
  }
  
  submitEntry(e){
    if (e.key == 'Enter'){
      var id = e.target.id;
      var value = e.target.value;
      
      document.getElementById(id).value = '';
      this.parseReq(id, value);
    }
  }
  
  submitBlur(e){
    var id = e.target.id;
    var value = e.target.value;
 
    document.getElementById(id).value = '';
    this.parseReq(id, value);
  }
  
  parseReq(id, value){
    
    var test = moment(value, "YYYY-MM-DD",true);
    var pointer = (id == 'from') ? 'start' : 'end';
    
    if (!test.isValid()) {
      alert('Invalid date format.');
      this.setState({[id]: this.state[pointer]});
    } else {
      if ((id == 'from' && new Date(value) > new Date(this.state.end)) ||
          (id == 'to' && new Date(value) < new Date(this.state.start))){
          alert('Start date should precede end date');
          this.setState({[id]: this.state[pointer]});
      } else {
        if (new Date(value) <= new Date("2005-12-31") || new Date(value) > new Date()){
          alert('Range exceeded. Please use dates between 2006-01-01 and current date.');
          this.setState({[id]: this.state[pointer]});
        } else {
          if (id == 'from'){
            this.props.newDateRange({start: value, end: this.state.end});
          } else {
            this.props.newDateRange({start: this.state.start, end: value});
          }
        };
      }
    };
    this.props.setPeriod('');
  }
  
  changeFrom(e){
    this.setState({from: e.target.value});
  }
  
  changeTo(e){
    this.setState({to: e.target.value});
  }
  
  componentDidUpdate(){
    if (this.state.start != this.props.dateRange.start ||
      this.state.end != this.props.dateRange.end) {
      
      this.setState({start: this.props.dateRange.start,
                  end: this.props.dateRange.end,
                  from: this.props.dateRange.start,
                  to: this.props.dateRange.end});
      }
    this.setColors(this.props.period);
  }
  
  componentDidUpdate(){
    this.setColors(this.props.period);
    
    if (this.state.start != this.props.dateRange.start ||
      this.state.end != this.props.dateRange.end) {
        this.setState({start: this.props.dateRange.start,
          end: this.props.dateRange.end,
          from: this.props.dateRange.start,
          to: this.props.dateRange.end});
      }
  }
  
  componentWillMount(){
    this.setState({start: this.props.dateRange.start,
      end: this.props.dateRange.end,
      from: this.props.dateRange.start,
      to: this.props.dateRange.end});
    
    window.requestAnimationFrame(() => {
      this.setColors(this.props.period);
    })    
  }
  
  render() {
    let ctrlDiv = Object.assign({}, styles.ctrlDiv);
    let periodInputDiv = Object.assign({}, styles.periodInputDiv);
    
    if (document.body.clientWidth <= 720) {
      ctrlDiv.flexDirection = "column";
      ctrlDiv.alignItems = "center";
      
      periodInputDiv.marginLeft = "0";
      periodInputDiv.marginTop = "1rem";
    }
    
    return (
      <div style={ctrlDiv}>
        <div style={styles.periodButtonDiv}>
          <label style={styles.periodLabel}>Last: </label>
          <div style={styles.periodButton} onClick={this.clickHandler} id="b1m">1M</div>
          <div style={styles.periodButton} onClick={this.clickHandler} id="b3m">3M</div>
          <div style={styles.periodButton} onClick={this.clickHandler} id="b6m">6M</div>
          <div style={styles.periodButton} onClick={this.clickHandler} id="bytd">YTD</div>
          <div style={styles.periodButton} onClick={this.clickHandler} id="b1y">1Y</div>
        </div>
        <div style={periodInputDiv}>
          <div style={styles.inputD}>
            <label style={styles.periodInputLabel}>From: </label>
            <input style={styles.periodInput} 
                   value={this.state.from} 
                   onKeyPress={this.submitEntry}
                   onBlur={this.submitBlur}
                   onChange={this.changeFrom}
                   id="from"/>
          </div>
          <div style={styles.inputD}>
            <label style={styles.periodInputLabel}>To: </label>
            <input style={styles.periodInput} 
                   onKeyPress={this.submitEntry}
                   onBlur={this.submitBlur}
                   onChange={this.changeTo}
                   value={this.state.to}
                   id="to"/>
          </div>
        </div>
      </div>
    )
  }
}