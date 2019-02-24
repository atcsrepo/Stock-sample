const d3 = Object.assign({}, 
  require("d3-axis"), 
  require("d3-shape"), 
  require("d3-scale"),
  require("d3-selection"),
  require("d3-time-format"),
  require("d3-time"));
const React = require('react');
const styles = require('./styles.js');
const tooltip = require('./d3Tooltip.js');
const colorTable = require('./colorTable.js');

module.exports = class Graph extends React.Component {
  
  constructor(props){
    super(props);
    
    this.state = {
      width: 0,
    };
    
    this.drawGraph = this.drawGraph.bind(this);
    this.dimensions = this.dimensions.bind(this);
  }
  
  drawGraph(ref){
    
    //define variables
    
    let width = parseInt(d3.select('#svgHolder').style('width')),
        height = parseInt(window.getComputedStyle(document.getElementById("svgHolder"),null)
                .getPropertyValue("height"), 10),
        padding = 50,
        paddingLeft = 90,
        paddingRight = 30,

        startDate = Infinity,
        endDate = -Infinity,
        numDays = 0,
    
        minChange = Infinity,
        maxChange = -Infinity,
        stocks = this.props.data,
    
        globalTimeOffset = new Date().getTimezoneOffset() * 60000;
        
    if (!width){
      return;
    }
    
    //find min/max date in case incoming is different 
    for (let i = 0; i < stocks.length; i++){
   
      let testEnd = stocks[i].endDate;
      let testStart = stocks[i].startDate;
      
      if (!testEnd && !testStart){
        continue;
      }
      
      if (testEnd > endDate) {
        endDate = testEnd;
      };
      
      if (testStart < startDate) {
        startDate = testStart;
      };
    };
    
    numDays = (endDate - startDate)/1000/3600/24;
    
    //find min/max change in positive and negative direction
    for (var i = 0; i < stocks.length; i++){
      if (stocks[i].closing.length){  
        var initPrice = stocks[i].closing[stocks[i].closing.length - 1].price;
        
        if (parseFloat(initPrice) === 0) {
          initPrice = 0.0001
        }

        for (var j=0; j < stocks[i].closing.length; j++){
          
          var percentChange = ((stocks[i].closing[j].price-initPrice)/initPrice)*100;
          stocks[i].closing[j].change = percentChange;
          
          if (percentChange > maxChange) {
            maxChange = percentChange;
          };
          
          if (percentChange < minChange){
            minChange = percentChange;
          };
        };
      };
    }; 
    
    d3.selectAll('path').remove();
    d3.selectAll('g').remove();
    d3.select('#tooltip').remove();
    d3.selectAll('circle').remove();
    
    //make scales and axis
    const xScale = d3.scaleTime()
               .domain([new Date(startDate + globalTimeOffset), new Date(endDate + globalTimeOffset)])
               .range([paddingLeft, width - paddingRight]);

    const yScale = d3.scaleLinear()
                     .domain([minChange, maxChange])
                     .range([height-padding, padding]);

    let xAxis;

    const yAxis = d3.axisLeft(yScale)
                    .ticks(5);

    if (numDays > 31) {
      xAxis = d3.axisBottom(xScale);
      
      if (numDays < 90) {
        xAxis.ticks(d3.timeMonth.every(1));
      } else {
        if (document.body.clientWidth < 500) {
          xAxis.ticks(2);
        } else {
          xAxis.ticks(5);
        }
      }
      
      xAxis.tickFormat(function(date){
        if (d3.timeYear(date) < date) {
          return d3.timeFormat("%b")(date);
        } else {
          return d3.timeFormat("%Y")(date);
        }
      });
    } else {
      xAxis = d3.axisBottom(xScale)
                    .tickFormat(d3.timeFormat("%b %d"));
      
      if (document.body.clientWidth < 500) {
        xAxis.ticks(2);
      } else {
        xAxis.ticks(4);
      }
    }
  
    d3.select(ref)
      .append('g')
        .attr('transform', 'translate(0,'+ (height-padding)+')')
        .style('font-size', '1.2rem')
        .style('font-weight', 'bold')
        .call(xAxis)
      
    d3.select(ref)
      .append('g')
        .attr('transform', 'translate('+ (paddingLeft)+',0)')
        .style('font-size', '1.2rem')
        .call(yAxis)
      
    d3.select(ref)
      .append('g')
      .append('text')
        .style('text-anchor', 'middle')
        .style('font-size', '1.3rem')
        .style('font-weight', 'bold')
        .attr('x', -height/2)
        .attr('y', padding/1.5)
        .attr('transform', 'rotate(-90)')
        .text('Percent Change')
        
            
    //make trend lines
    
    for (var i = 0; i < stocks.length; i++){
      
      var linePath = d3.line()
                       .x((d) => {return xScale(d.date + globalTimeOffset)})
                       .y((d) => {return yScale(d.change)});
      
      var dataSet = stocks[i].closing;
      
      d3.select(ref)
        .append('path')
        .datum(dataSet)
          .attr('fill', 'none')
          .attr('stroke', () => {return colorTable[i % 64]})
          .attr('stroke-width', '2')
          .attr('d', linePath)
    }
    
    //create tooltip, vertical markers and circle markers for chart
    tooltip(ref, stocks, endDate, xScale, yScale);
  }
  
  dimensions(){
    let width = d3.select("#svgHolder").style('width');
    
    this.setState({width: width});
    
    this.props.fHeight();
  }
  
  componentDidUpdate(){
    if (this.props.resized) {
      this.dimensions();
      this.props.nullResize();
    }
  }

  render() {
    return (
      <div style={styles.svgHolder} id="svgHolder">
        <svg ref={(node) => {this.drawGraph(node)}} style={styles.svgG}>
        </svg>
      </div>
    )
  }
}