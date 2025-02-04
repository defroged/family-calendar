var CALENDARS = [
  {
    id: "ronward.english@gmail.com",
    label: "Blue Star",
    color: "#489160"
  },
    {
    id: "5fb90aa40e9e7b564d69a8ffd96a610cf1a0418e9ff100bb8cf1520a8c2b751b@group.calendar.google.com",
    label: "その他",
    color: "#d85675"
  },
    {
    id: "tm-kids.com_i066m9p1pvu8ouuknb4hal74u4@group.calendar.google.com",
    label: "本町",
    color: "orange"
  },
      {
    id: "c_a10cfefde2a5de52589bc01f1c2899c8d7035acfe6349bb7b7e47177a56b592e@group.calendar.google.com",
    label: "ひびき",
    color: "orange"
  },
  {
    id: "c_1au77uvsbhjjkbbn0u0o1nvfdo@group.calendar.google.com",
    label: "杉並",
    color: "orange"
  }
];

// Replace with your Google API key
var API_KEY = "AIzaSyAJkLCd0IJ2dPxLeijCUO7HClOwSoy5j-Q";

/**
 * Create a simple monthly calendar and fetch events from Google Calendar.
 * This is set up for older iOS devices, so we're using ES5 syntax and XHR.
 */
(function() {
	// Only preventDefault if the touch is NOT inside .modal-content
  document.addEventListener("touchmove", function(e) {
    if (!isInsideModalContent(e.target)) {
      e.preventDefault();
    }
  }, false);

  // Helper function to detect whether 'target' is inside an element with class="modal-content"
  function isInsideModalContent(target) {
    while (target) {
      if (target.classList && target.classList.contains("modal-content")) {
        return true;
      }
      target = target.parentNode;
    }
    return false;
  }
  // -------------------------
  // Global variables & setup
  // -------------------------
  var dayEventsMap = {};
  var today = new Date();
  var currentYear = today.getFullYear();
  var currentMonth = today.getMonth(); // 0-based

  // References
  var headerEl = document.getElementById("calendar-header");
  var calendarDaysEl = document.getElementById("calendar-days");
  var calendarContainer = document.getElementById("calendar-container");

  // Create a "Today" button in the header (top-left corner)
var todayBtn = document.createElement("button");
todayBtn.textContent = "Today";
todayBtn.className = "today-btn"; // Assign a class to the button
todayBtn.addEventListener("click", resetToCurrentMonth);
headerEl.parentNode.insertBefore(todayBtn, headerEl);


  // Month names for display
  var monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // We'll keep track of whether we're animating a swipe
  var isAnimating = false;

  // -------------------------
  // Build Calendar & Events
  // -------------------------
  buildCalendar(currentYear, currentMonth);
  fetchEventsForAllCalendars();

  function buildCalendar(year, month) {
    // Clear dayEventsMap whenever we rebuild
    dayEventsMap = {};

    // Display header text
    headerEl.textContent = monthNames[month] + " " + year;

    // Clear the existing day cells
    calendarDaysEl.innerHTML = "";

    // Determine start day of the month, and number of days
    var firstDayOfMonth = new Date(year, month, 1);
    var startDay = firstDayOfMonth.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    // Insert blank cells before day 1
    for (var i = 0; i < startDay; i++) {
      var blankCell = document.createElement("div");
      blankCell.className = "day-cell";
      calendarDaysEl.appendChild(blankCell);
    }

    // Add actual day cells
    for (var d = 1; d <= daysInMonth; d++) {
      var dayCell = document.createElement("div");
      dayCell.className = "day-cell";

      var dayNumber = document.createElement("span");
      dayNumber.className = "day-number";
      dayNumber.textContent = d;
      dayCell.appendChild(dayNumber);

      // Initialize storage
      dayEventsMap[d] = [];

      // Click -> open modal
      dayCell.addEventListener("click", (function(dayNum) {
        return function() {
          openModal(dayNum);
        };
      })(d));

      calendarDaysEl.appendChild(dayCell);
    }

    // Set up date range to fetch
    var startDate = new Date(year, month, 1);
    var endDate = new Date(year, month + 1, 0, 23, 59, 59);

    timeMin = toRFC3339(startDate);
    timeMax = toRFC3339(endDate);
  }

  function showNextMonth() {
    if (isAnimating) return;
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    animateSwipe(-1, function() {
      buildCalendar(currentYear, currentMonth);
      fetchEventsForAllCalendars();
    });
  }

  function showPreviousMonth() {
    if (isAnimating) return;
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    animateSwipe(1, function() {
      buildCalendar(currentYear, currentMonth);
      fetchEventsForAllCalendars();
    });
  }

  function resetToCurrentMonth() {
    if (isAnimating) return;
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    buildCalendar(currentYear, currentMonth);
    fetchEventsForAllCalendars();
  }

  // -------------------------
  // Animation for Swipes
  // -------------------------
  function animateSwipe(direction, callback) {
    // direction = -1 means swipe left, +1 means swipe right
    // We'll apply a temporary transform to the calendar container
    isAnimating = true;
    var initialPos = 0;
    var finalPos = direction * 100; // percent-based shift

    // Add a CSS transition
    calendarContainer.style.transition = "transform 0.3s ease";
    calendarContainer.style.transform = "translateX(" + finalPos + "%)";

    // After the transition ends, reset
    var onTransitionEnd = function() {
      calendarContainer.style.transition = "none";
      calendarContainer.style.transform = "translateX(0)";
      calendarContainer.removeEventListener("transitionend", onTransitionEnd);
      isAnimating = false;
      if (callback) callback();
    };
    calendarContainer.addEventListener("transitionend", onTransitionEnd);
  }

  // -------------------------
  // Swipe / Touch Handling
  // -------------------------
  var startX = null;
  var endX = null;
  var threshold = 50; // Minimum swipe distance

  calendarContainer.addEventListener("touchstart", function(e) {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
    }
  });

  calendarContainer.addEventListener("touchmove", function(e) {
    if (startX !== null && e.touches.length === 1) {
      endX = e.touches[0].clientX;
    }
  });

  calendarContainer.addEventListener("touchend", function(e) {
    if (startX !== null && endX !== null) {
      var deltaX = startX - endX;
      if (deltaX > threshold) {
        // swipe left -> show next
        showNextMonth();
      } else if (deltaX < -threshold) {
        // swipe right -> show previous
        showPreviousMonth();
      }
    }
    startX = null;
    endX = null;
  });

  // -------------------------
  // GCal Data Fetch
  // -------------------------
  var timeMin, timeMax;
  function fetchEventsForAllCalendars() {
  // We still call fetchEvents once initially,
  // but we will refresh the entire page every 30 minutes.
  function fetchEvents() {
    for (var i = 0; i < CALENDARS.length; i++) {
      fetchEventsForOneCalendar(CALENDARS[i]);
    }
  }
  fetchEvents();
  setInterval(function() {
    location.reload();
  }, 1800000); // 30 minutes = 1800000ms
}


  function fetchEventsForOneCalendar(calendar) {
    var url = "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calendar.id) +
      "/events?key=" + API_KEY +
      "&timeMin=" + timeMin +
      "&timeMax=" + timeMax +
      "&singleEvents=true&orderBy=startTime";

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if (data && data.items) {
          renderEvents(data.items, calendar);
        }
      }
    };
    xhr.send();
  }

  function renderEvents(items, calendar) {
    for (var i = 0; i < items.length; i++) {
      var ev = items[i];
      var startStr = ev.start.dateTime
        ? ev.start.dateTime
        : (ev.start.date + "T00:00:00");
      var endStr = ev.end.dateTime
        ? ev.end.dateTime
        : (ev.end.date + "T23:59:59");

      var startDate = new Date(startStr);
      var endDate = new Date(endStr);
      var day = startDate.getDate();

      var eventInfo = {
        summary: ev.summary || "(No Title)",
        start: startDate,
        end: endDate,
        calendarLabel: calendar.label,
        calendarColor: calendar.color
      };

      if (!dayEventsMap[day]) {
        dayEventsMap[day] = [];
      }
      dayEventsMap[day].push(eventInfo);
    }
    refreshDayCells();
  }


function groupConsecutiveEventsForDisplay(events) {
  if (!events || events.length === 0) return [];

  // Sort by start time
  events.sort(function(a, b) {
    return a.start.getTime() - b.start.getTime();
  });

  var groups = [];
  var currentGroup = null;
  var previousEvent = null;
  var THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutes in ms

  for (var i = 0; i < events.length; i++) {
    var e = events[i];

    if (!currentGroup) {
      // first group
      currentGroup = {
        label: e.calendarLabel,
        color: e.calendarColor,
        events: [ e ]
      };
      groups.push(currentGroup);
      previousEvent = e;
    } else {
      // Check if we can merge with the currentGroup
      // Condition: same label AND the gap between this event and the previous event is <= 30 min
      if (
        currentGroup.label === e.calendarLabel &&
        (e.start.getTime() - previousEvent.end.getTime()) <= THIRTY_MINUTES
      ) {
        // Merge: add this event
        currentGroup.events.push(e);
      } else {
        // Start a new group
        currentGroup = {
          label: e.calendarLabel,
          color: e.calendarColor,
          events: [ e ]
        };
        groups.push(currentGroup);
      }
      previousEvent = e;
    }
  }

  return groups;
}


  function refreshDayCells() {
  var firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  var startDay = firstDayOfMonth.getDay();
  var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  var dayCells = calendarDaysEl.getElementsByClassName("day-cell");

  // Define our compressed day range in minutes: 8 AM (480) to 10 PM (1320).
  var START_OF_DAY = 8 * 60;   // 8:00 => 480 minutes after midnight
  var END_OF_DAY   = 22 * 60;  // 22:00 => 1320 minutes
  var TOTAL_RANGE  = END_OF_DAY - START_OF_DAY; // 1320 - 480 = 840 minutes

  for (var d = 1; d <= daysInMonth; d++) {
    var cellIndex = startDay + d - 1;
    if (cellIndex >= 0 && cellIndex < dayCells.length) {
      var dayCell = dayCells[cellIndex];

      // Remove any existing event elements
      while (dayCell.getElementsByClassName("event")[0]) {
        dayCell.removeChild(dayCell.getElementsByClassName("event")[0]);
      }

      var eventsForDay = dayEventsMap[d] || [];
      eventsForDay.sort(function(a, b) {
        return a.start - b.start;
      });

      var groupedEvents = groupConsecutiveEventsForDisplay(eventsForDay);

      for (var j = 0; j < groupedEvents.length; j++) {
        var group = groupedEvents[j];

// ---------------------
// Calculate position & size of the group block
// ---------------------

// We'll place the group block according to the earliestStart for its topOffset,
// but we'll compute the total duration of all consecutive events for its height.
var dayCellHeight = dayCell.clientHeight;

// First, find the earliest start time among all events (for positioning):
var earliestStart = group.events[0].start.getTime();
for (var k = 1; k < group.events.length; k++) {
  var evStart = group.events[k].start.getTime();
  if (evStart < earliestStart) {
    earliestStart = evStart;
  }
}

// Convert earliestStart to minutes after midnight and clamp:
var earliestStartDateObj = new Date(earliestStart);
var earliestStartMinutes = earliestStartDateObj.getHours() * 60 + earliestStartDateObj.getMinutes();

if (earliestStartMinutes < START_OF_DAY) {
  earliestStartMinutes = START_OF_DAY;
}

// We'll use this to set the topOffset of our block:
var adjustedEarliest = earliestStartMinutes - START_OF_DAY;
if (adjustedEarliest < 0) {
  adjustedEarliest = 0;
}
var topOffset = (adjustedEarliest / TOTAL_RANGE) * dayCellHeight;

// Next, sum up the duration (in minutes) of all events in this group (each event is consecutive).
var totalDurationMinutes = 0;
for (var m = 0; m < group.events.length; m++) {
  // For each event, clamp its start and end times to 8 AM / 10 PM
  var evStartObj = group.events[m].start;
  var evEndObj   = group.events[m].end;

  var evStartMin = evStartObj.getHours() * 60 + evStartObj.getMinutes();
  var evEndMin   = evEndObj.getHours() * 60 + evEndObj.getMinutes();

  if (evStartMin < START_OF_DAY) evStartMin = START_OF_DAY;
  if (evEndMin   > END_OF_DAY)   evEndMin   = END_OF_DAY;
  if (evEndMin < evStartMin) evEndMin = evStartMin; // edge case if outside range

  totalDurationMinutes += (evEndMin - evStartMin);
}

// Compute block height based on total duration of all consecutive events:
var scaleFactor = 1.2;  // double the height (use 1.5 or 1.2, etc., as needed)
var blockHeight = ((totalDurationMinutes / TOTAL_RANGE) * dayCellHeight) * scaleFactor;
blockHeight = Math.max(blockHeight, 16 * scaleFactor);


        // Create the event block
        var eventEl = document.createElement("div");
        eventEl.className = "event";
        eventEl.style.position = "absolute";
        eventEl.style.top = topOffset + "px";
        eventEl.style.left = "0";
        eventEl.style.width = "90%";
        eventEl.style.height = blockHeight + "px";
        eventEl.style.display = "flex";
        eventEl.style.alignItems = "center";
        eventEl.style.justifyContent = "center";
        eventEl.style.background = group.color;
        eventEl.style.borderLeft = "3px solid " + group.color;

        eventEl.textContent = group.label;
        dayCell.appendChild(eventEl);
      }
    }
  }
}


  // -------------------------
  // Modal
  // -------------------------
  var modalOverlay = document.getElementById("modal-overlay");
  var modalContent = document.getElementById("modal-content");
  var modalEventsList = document.getElementById("modal-events-list");
  var closeModalBtn = document.getElementById("close-modal");

  closeModalBtn.addEventListener("click", function() {
    closeModal();
  });

  modalOverlay.addEventListener("click", function(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  function openModal(dayNum) {
    var dayNamesJa = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    var dateObj = new Date(currentYear, currentMonth, dayNum);
    var dayName = dayNamesJa[dateObj.getDay()];
    var dateNumber = dateObj.getDate();
    var year = dateObj.getFullYear();
    var monthNumber = dateObj.getMonth() + 1;

    var modalTitleEl = document.getElementById("modal-title");
    if (modalTitleEl) {
      modalTitleEl.textContent =
        year + "年" + monthNumber + "月" + dateNumber + "日 (" + dayName + ")";
    }

    modalEventsList.innerHTML = "";

    var events = dayEventsMap[dayNum] || [];
    events.sort(function(a, b) {
      return a.start - b.start;
    });

    for (var i = 0; i < events.length; i++) {
      var item = events[i];
      var startTime = formatTime(item.start);
      var endTime = formatTime(item.end);

      var itemDiv = document.createElement("div");
      itemDiv.className = "modal-event-item";
      itemDiv.innerHTML =
        "<div><strong>" + item.summary + "</strong></div>" +
        "<div>" + startTime + " - " + endTime + "</div>" +
        "<div style='color:" + item.calendarColor + "'>" + item.calendarLabel + "</div>";
      modalEventsList.appendChild(itemDiv);
    }
    modalOverlay.style.display = "flex";
  }

  function closeModal() {
    modalOverlay.style.display = "none";
  }

  function formatTime(dateObj) {
    var hours = dateObj.getHours();
    var minutes = dateObj.getMinutes();
    var hh = (hours < 10 ? "0" + hours : hours);
    var mm = (minutes < 10 ? "0" + minutes : minutes);
    return hh + ":" + mm;
  }

  function toRFC3339(dateObj) {
    return dateObj.getFullYear() + "-" +
      pad(dateObj.getMonth() + 1) + "-" +
      pad(dateObj.getDate()) + "T" +
      pad(dateObj.getHours()) + ":" +
      pad(dateObj.getMinutes()) + ":" +
      pad(dateObj.getSeconds()) + "Z";
  }

  function pad(num) {
    return (num < 10 ? "0" : "") + num;
  }
})();


