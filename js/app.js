var PRECISION = 3; // # decimal places on numbers

$(document).foundation();

$(function($){
  $('#videoURL').attr('value', 'mov/SprintSpeedExample.mov');
  $('#animalID').attr('value', '');
  $('#fps').attr('value', '30');
  $('#videoWidth').attr('value', '1280');
  $('#videoHeight').attr('value', '720');

/*
  $('#copySummary').zclip({
    path:'js/ZeroClipboard.swf',
    copy:$('#outputSummary').val()
  });

  $('#copyDetails').zclip({
    path:'js/ZeroClipboard.swf',
    copy:$('#outputDetails').val()
  });

*/

  videojs("video", {}, function(){
    var videoPlayer = this;
  });

  videojs('video').errors();

  showVideoForm(true);
})

$('#video-load').click(function (e) {
  var fps = parseInt($('#fps').val(), 10);
  if (!fps || fps > 1000 || fps < 1) {
    alert('Please enter a numeric frame rate between 1 and 1000.')
    $('#fps').focus();
    return;
  }

  var videoWidth = parseInt($('#videoWidth').val(), 10);
  if (!videoWidth || videoWidth < 1) {
    alert("Please enter a whole-number video width.");
    $('#videoWidth').focus();
    return;
  }

  var videoHeight = parseInt($('#videoHeight').val(), 10);
  if (!videoHeight || videoHeight < 1) {
    alert("Please enter a whole-number video height.");
    $('#videoHeight').focus();
    return;
  }

  $.videoInfo = {
    url : $('#videoURL').val(),
    id : $('#animalID').val(),
    fps : fps,
    deltaFrames : parseInt($('#deltaFrames').val(), 10),
    scaleReference : parseFloat($('#scaleReference').val(), 10) / 100, // convert to cm
    videoWidth : videoWidth,
    videoHeight : videoHeight,
    // Calculated attributes
    elapsedTime : 0,
    startTime : 0,
    scale : 0,
    totalDistance : 0,
    maxSpeed : 0
  };

  $.videoInfo.deltaTime = 1.0 / $.videoInfo.fps * $.videoInfo.deltaFrames;

  console.log($.videoInfo);
  $('#video').width($.videoInfo.videoWidth);
  $('#video').height($.videoInfo.videoHeight);

  videoPlayer = videojs('video');
  videoPlayer.src($.videoInfo.url);

  resetDetails();

  showScaleUI();
  $.settingScale = true;
});

$('#restart').click(function (e) {
  delete $.videoInfo;
  delete $.firstPoint;
  resetScale();
  showVideoForm();
});

$(document).keydown(function(e) {
  if ($.settingScale) return;

  videoPlayer = videojs('video');
  if (e.keyCode == 37) { 
    videoPlayer.currentTime(videoPlayer.currentTime() - $.videoInfo.deltaTime);
    return false;
  }
  else if (e.keyCode == 39) {
    videoPlayer.currentTime(videoPlayer.currentTime() + $.videoInfo.deltaTime);
    return false;
  }
});

function resetScale() {
  $('#scale').html('?');
  delete $.scalePoint1;
  delete $.scalePoint2;
  if ($.videoInfo) $.videoInfo.scale = 0;
}

$('#video-wrapper').click(function (e) {
  videoPlayer = videojs('video');

  // Offsets can be non-integral when positioning using ems. We need to floor to whole-pixel boundaries. (Flooring ensures that the top corner will be 0,0.)
  var x = e.pageX - Math.floor($(this).offset().left),
      y = e.pageY - Math.floor($(this).offset().top);

  console.log("left, top = ", $(this).offset().left, $(this).offset().top, x, y)

  if (x >= $.videoInfo.videoWidth || y >= $.videoInfo.videoHeight) {
    alert("Please click inside the video boundaries (" + $.videoInfo.videoWidth + " x " + $.videoInfo.videoHeight + ")");
    return;
  }

  if ($.settingScale) {
    // Users can set and reset the scale ad infinitum
    if ($.scalePoint1 && $.scalePoint2) {
      resetScale();
      updateSummary();
      // do not return -- we need to use their click to set scalePoint1 below
    }
    if (!$.scalePoint1) {
      $.scalePoint1 = {x : x, y : y};
    } else {
      $.scalePoint2 = {x : x, y : y};
      console.log($.scalePoint1, $.scalePoint2)
      $.videoInfo.scale = getDistance($.scalePoint1, $.scalePoint2);
      $('#scale').html($.videoInfo.scale.toFixed());
    }
  } else {
    var t = videoPlayer.currentTime();
    var p = {x:x, y:y, t:t};

    if ($.firstPoint) {
      pScaled = getScaledPoint(p, $.firstPoint)
    } else {
      $.firstPoint = p
      pScaled = {x:0, y:0, t:p.t}; // first point is by definition 0,0
    }

    updateDetails(p, pScaled);

    videoPlayer.currentTime(t + $.videoInfo.deltaTime);

    // Update summary info
    if (!$.videoInfo.startTime) {
      $.videoInfo.startTime = t;
    }
    $.videoInfo.elapsedTime = t - $.videoInfo.startTime;
    updateSummary();
  }

  // Only allow default if event was near playbackcontrols
  e.stopPropagation();
  e.preventDefault();
});

$('#set-scale').click(function (e) {
  updateSummary();
  if ($.videoInfo.scale > 0) {
    $.settingScale = false;
    showVideoUI();
  } else {
    alert("Please click twice at different locations in the video to set the scale distance.");
    // Reset scale just in case user gets confused.
    resetScale();
  }
});

function updateSummary() {
  var txt = "";

  txt += 'URL: ' + $.videoInfo.url + '\n';
  txt += 'Animal ID: ' + $.videoInfo.id + '\n';
  txt += 'Frame Rate (f/s): ' + $.videoInfo.fps + '\n';
  txt += 'Video Width (px): ' + $.videoInfo.videoWidth + '\n';
  txt += 'Video Height (px): ' + $.videoInfo.videoHeight + '\n';
  txt += 'Start Time (s): ' + $.videoInfo.startTime.toFixed(2) + '\n';
  txt += 'Elapsed Time (s): ' + $.videoInfo.elapsedTime.toFixed(2) + '\n';
  if ($.videoInfo.scale > 0) txt += 'Scale: ' + $.videoInfo.scale.toFixed() + '\n';

  $('#outputSummary').val(txt);
}

function resetDetails() {
  $("#outputDetails").val("ID\tt\tx (px)\ty (px)\tx (m)\ty (m)\n");
}

function updateDetails(p, pScaled) {
  if (p.t != pScaled.t) {
    alert("Error in updateDetails: time mismatch of point and scaled point")
  }
  var txt = "";

  txt += $.videoInfo.id + '\t';
  txt += p.t.toFixed(PRECISION) + '\t';
  txt += p.x.toFixed(1) + '\t'; // px coords should be integral
  txt += p.y.toFixed(1) + '\t';
  txt += pScaled.x.toFixed(PRECISION) + '\t';
  txt += pScaled.y.toFixed(PRECISION) + '\n';
  
  var outputDetails = $("#outputDetails");
  outputDetails.val(outputDetails.val() + txt);
  outputDetails.scrollTop(
    outputDetails[0].scrollHeight - outputDetails.height()
  );
}

function showVideoForm(noAnimation) {
  $('#navbarTitle').html('Step 1: Load');
  $('#videoForm').show();
  $('#scaleForm').hide();
  $('#videoUI').hide();
}

function showScaleUI(noAnimation) {
  $('#navbarTitle').html('Step 2: Calibrate');
  $('#videoForm').hide();
  $('#scaleForm').show();
  $('#videoUI').show();
}

function showVideoUI(noAnimation) {
  $('#navbarTitle').html('Step 3: Record');
  $('#videoForm').hide();
  $('#scaleForm').hide();
  $('#videoUI').show();
}

function getDistance(p1, p2) {
  //console.log('p1 = (' + p1.x + ', ' + p1.y + '), p2 = (' + p2.x + ', ' + p2.y + ')');
  var d = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  return d;
}

function getScaledPoint(p, firstPoint) {
  console.log("p: ", p);
  console.log("   firstPoint = ", firstPoint);
  var scaleFactor = $.videoInfo.scaleReference / $.videoInfo.scale;
  return {x: (p.x - firstPoint.x) * scaleFactor, y: -(p.y - firstPoint.y) * scaleFactor, t: p.t}
}
