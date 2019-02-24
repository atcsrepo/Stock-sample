/*
  Binary tree search to locate closest index to point. Returns null if target point is earlier than start date of array (i.e. date of last array object) or past endIdx
  Otherwise, it returns an index
*/
const msecInDay = 24 * 60 * 60 * 1000;

module.exports = function bisect(arr, endDate, point, startIdx, endIdx) {
  
  if (startIdx == null) {
    startIdx = arr.length - 1;
  }
  
  if (endIdx == null) {
    endIdx = 0;
  }
  
  if (arr.length == 0) {
    return null;
  }
  
  //catch some fringe input
  if (point > endDate) {
    return null;
  }
  
  //catches things that start before period, in case of truncated data
  if (arr[startIdx].date > point) {
    return null;
  }
  
  if (arr[endIdx].date < point) {
    return null;
  }
  
  //catches things that extend past period, in case of truncated data
  //point % msecInDay)/msecInDay determines distance to next day
  if (arr[endIdx].date < point  && ((point % msecInDay)/msecInDay) > 0.5) {
    return null;
  }
  
  //When only two indexes remain, takes the difference between the two dates and determine
  //where the point lies between the two. Returns startIdx if point is < 0.5
  if ((startIdx - endIdx) <= 1){
    var DateProportion = (arr[endIdx].date - arr[startIdx].date);
    
    if(((point - arr[startIdx].date) / DateProportion) > 0.5){
      return endIdx;
    } else {
      return startIdx;
    }
  }
  
  var mid = Math.ceil((startIdx + endIdx) / 2);
  
  if (arr[mid].date > point) {
    endIdx = mid;
  } else {
    startIdx = mid;
  }
  
  return bisect(arr, endDate, point, startIdx, endIdx);
}