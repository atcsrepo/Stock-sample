const d3 = Object.assign({}, 
  require("d3-scale"),
  require("d3-selection"));
const bisect = require('./bisect.js');
const styles = require('./styles.js');
const colorTable = require('./colorTable.js');

module.exports = function(ref, stocks, endDate, xScale, yScale){
  
  //defines variables used
  //globalOffset accounts for date difference from new Date
  
  let width = parseInt(d3.select('#svgHolder').style('width'));
  let height = parseInt(window.getComputedStyle(document.getElementById("svgHolder"),null).getPropertyValue("height"), 10);
  //var height = parseInt(d3.select('#svgHolder').style('height'));
  let padding = 50;
  let paddingLeft = 70;
  let paddingRight = 30;
  let globalTimeOffset = new Date().getTimezoneOffset() * 60000;
    
  //set-up tooltip
    
  let div = d3.select('body')
            .append('div')
              .attr('id', 'tooltip')
              .style('width', '8rem')
              .style('display', 'none')
              .style('position', 'absolute')
              .style('pointer-events', 'none')
              .style('color', 'black')
              .style('background-color', '#AEB6BF')
              .style('border', '2px solid black')
              .style('border-radius', '5px')
              .style('font-size', '1.1rem')
              .style('line-height', '50%')
              .style('padding', '5px');
    
  //make overlay
  //pointer-events all require to detect events on fill none
  /*point of note:
  
    Originally, no group (class overlay) was used, i.e.:
      d3.select(ref).append('rect')
      
    and subsequently, the vertical line for on('mousemove') was appended to ref/node directly, i.e.:
       d3.select(ref).append('rect')
       
    however, because the vertical line was at the same position as the mouse pointer, this led to mouseout events
    being fired after the line was rendered.
    
    Instead, a group was added, with class overlay, where both the orignal rect overlay and vertical line are appended. 
    Mouseeneter and mouseout events are passed on to child, so they are no longer fired when the line renders 
    
    Lastly, on the version 59.0.3x version of Chrome, mouseenter/leave appears
    to not trigger when mouse moving too slowly. Added quick fix with a <g> on the right side
  */
    
  d3.select(ref)
    .append('g')
      .attr('class', 'overlay')
      .attr('width', width - (padding * 2))
      .attr('height', height - (padding * 2))
      .style('pointer-events', 'all')
    .append('rect')
      .attr('width', width - (padding * 2))
      .attr('height', height - (padding * 2))
      .attr('transform', 'translate('+ paddingLeft +','+ padding +')')
      .attr('fill', 'none')
    
  d3.select('.overlay') 
    .style('pointer-events', 'all')
    .on('mouseenter', () => {
      div.style('display', 'inline');
    })
    .on('mousemove', () => {
      mousemove();
    })
    .on('mouseleave', () => {
      div.style('display', 'none');
      d3.select('.vLine').remove();
      d3.selectAll('circle').remove();
    })
  
  //catches ignored mouseleave from chrome on the right side & bottom. 
  //Left & top don't interfere much, so ignored
  
  d3.select(ref)
    .append('g')
    .append('rect')
      .attr('width', paddingRight)
      .attr('height', height)
      .attr('transform', 'translate('+(width-paddingRight) +', 0)')
      .attr('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', () => {
        div.style('display', 'none');
        d3.select('.vLine').remove();
        d3.selectAll('circle').remove();
      })
  
  d3.select(ref)
    .append('g')
    .append('rect')
      .attr('width', width)
      .attr('height', 40)
      .attr('transform', 'translate(0,'+ (height-40) +')')
      .attr('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', () => {
        div.style('display', 'none');
        d3.select('.vLine').remove();
        d3.selectAll('circle').remove();
      })
  
  function mousemove(){
    
    //removes previous line for re-rendering
    
    d3.select('.vLine').remove();
    d3.selectAll('circle').remove();
    d3.getEvent = () => require("d3-selection").event;
    //used d3.event to get mouse position relative to svg container
    
    let position = d3.mouse(d3.getEvent().currentTarget);
    
    //acquire x values of lines and equivalent y values
    //note: bisector function from d3 requires sorted ascending, so cannot be used in this case
    
    let tooltipContent=[];
    let dateLine = [];
    
    for (let i = 0; i < stocks.length; i++){
      let itemIdx = bisect(stocks[i].closing, 
                            endDate, 
                            (xScale.invert(position[0]).valueOf()-globalTimeOffset));
   
      let value = (itemIdx || itemIdx == 0) ? stocks[i].closing[itemIdx].change : null;
      let date = (itemIdx || itemIdx == 0) ? stocks[i].closing[itemIdx].date : null;

      if (date && dateLine.length == 0) {
        dateLine.push(date);
      };
      
      tooltipContent.push({ticker: stocks[i].ticker, change: value, date: date, index: i});
    };
    
    //creating html for tooltip
    
    let tooltipDate = new Date(dateLine[0] + globalTimeOffset),
        ttyear = tooltipDate.getFullYear(),
        ttmonth = tooltipDate.getMonth() + 1,
        ttdate = tooltipDate.getDate(),
        dateString = ttyear +'-'+ ttmonth + '-' + ttdate,
        tooltipHTML = [];
    
    ttmonth = (ttmonth < 10) ? '0' + ttmonth : ttmonth;
    ttdate = (ttdate < 10) ? '0' + ttdate : ttdate;
    
    tooltipHTML.push("<p style='text-align: center'>"+dateString+"</p>");
    
    for (let i =0; i < tooltipContent.length; i++){
      tooltipHTML.push(
        "<p style='"+styles.tipText+"'><span style='color: "+colorTable[i%64]+"'>"+tooltipContent[i].ticker+"</span>: "+((tooltipContent[i].change != null) ? tooltipContent[i].change.toFixed(1) +"%": 'N/A')+"</p>"
      );
    };

    tooltipHTML = tooltipHTML.join('');

    //append tootip content & position
    
    document.getElementById('tooltip').innerHTML = tooltipHTML;
    
    div.style('top', d3.getEvent().pageY + "px");
       
    if (position[0] > width/2) {
      div.style('left', (d3.getEvent().pageX - 160) + "px");
    } else {
      div.style('left', (d3.getEvent().pageX + 20) + "px");
    }
    
    //Draw circles to mark location of y values
  
    d3.select('.overlay')
      .selectAll('circle')
      .data(tooltipContent)
      .enter().append('circle')
      .attr('cx', (d) => {if (d.date) return xScale(d.date + globalTimeOffset)})
      .attr('cy', (d) => {if (d.change || d.change == 0) return yScale(d.change)})
      .attr('r', (d) => {if (d.date) return 5})
      .style('fill', 'none')
      .style('stroke', (d) => {if (d.date) return colorTable[d.index]})
      .style('stroke-width', 3)
    
    //Draw vertical line. Class assigned to make it easier to remove 
    //When moving super slow with mouse, it is apparently possible to get positional values that exceed the 
    //range of the overlay. If statement added to prevent that from occuring.
    //This appears to be a problem with chrome only

    if (position[0] < (width - (paddingRight)) && dateLine.length){
      d3.select('.overlay')
        .append('g')
          .attr('class', 'vLine')
          .append('rect')
          .attr('width', '2')
          .attr('height', height-(2* padding))
          .attr('x', xScale(dateLine[0]+globalTimeOffset))
          .attr('y', padding)
    };
  };
}