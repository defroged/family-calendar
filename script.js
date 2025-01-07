var CALENDARS = [
  {
    id: "ronward.english@gmail.com",
    label: "BS",
    color: "blue"
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
  // Store all events by day in an object { dayNumber: [array of event objects] }
  var dayEventsMap = {};

  // Get today's date
  var today = new Date();
  var currentYear = today.getFullYear();
  var currentMonth = today.getMonth(); // 0-based (0 = January)
  
  // Populate the header text (e.g., "January 2025")
  var headerEl = document.getElementById("calendar-header");
  var monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  headerEl.textContent = monthNames[currentMonth] + " " + currentYear;

  // Build the monthly calendar structure (empty boxes + date numbers)
  var calendarDaysEl = document.getElementById("calendar-days");
  // Clear any existing HTML
  calendarDaysEl.innerHTML = "";

  // Create a date for the first day of this month
  var firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  // Find the day of the week the first day falls on (0=Sun, 1=Mon, etc.)
  var startDay = firstDayOfMonth.getDay();

  // Number of days in this month
  var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // First, add blank cells for days before 1st of the month
  var i;
  for (i = 0; i < startDay; i++) {
    var blankCell = document.createElement("div");
    blankCell.className = "day-cell";
    calendarDaysEl.appendChild(blankCell);
  }

  // Next, add cells for each day of the month
  for (i = 1; i <= daysInMonth; i++) {
    var dayCell = document.createElement("div");
    dayCell.className = "day-cell";

    // Show the day number
    var dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = i;
    dayCell.appendChild(dayNumber);

    // Initialize storage
    dayEventsMap[i] = [];

    // Add click listener to open modal
    dayCell.addEventListener("click", (function(dayNum) {
      return function() {
        openModal(dayNum);
      };
    })(i));

    calendarDaysEl.appendChild(dayCell);
  }

  /**
   * Now fetch events from Google Calendar for the current month.
   * We’ll filter events to only show those within this month.
   */
  var startDate = new Date(currentYear, currentMonth, 1);
  var endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

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

  var timeMin = toRFC3339(startDate);
  var timeMax = toRFC3339(endDate);

  fetchEventsForAllCalendars();

  function fetchEventsForAllCalendars() {
    for (var i = 0; i < CALENDARS.length; i++) {
      fetchEventsForOneCalendar(CALENDARS[i]);
    }
  }

  function fetchEventsForOneCalendar(calendar) {
  var url = "https://www.googleapis.com/calendar/v3/calendars/" +
    encodeURIComponent(calendar.id) +
    "/events?key=" + API_KEY +
    "&timeMin=" + timeMin +
    "&timeMax=" + timeMax +
    "&singleEvents=true&orderBy=startTime";
    // no timeZone parameter included

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

    // If it's an all-day event, we have only 'date' (e.g. "2025-01-06").
    // Otherwise we have 'dateTime' (e.g. "2025-01-06T15:30:00+09:00").

    var startStr = ev.start.dateTime 
      ? ev.start.dateTime 
      : (ev.start.date + "T00:00:00"); 

    // ---- 1) Strip out any offset like "+09:00" or "Z" for the day/time ----
    // We'll only look at the first 19 chars: "YYYY-MM-DDTHH:MM:SS"
    // Example: "2025-01-06T15:30:00+09:00" => "2025-01-06T15:30:00"
    var baseStartStr = startStr.substring(0, 19);

    // ---- 2) Extract date "YYYY-MM-DD" and time "HH:MM:SS" separately ----
    // baseStartStr looks like "2025-01-06T15:30:00"
    var datePart = baseStartStr.substring(0, 10);   // "2025-01-06"
    var timePart = baseStartStr.substring(11, 16);  // "15:30"

    // Parse the day-of-month from datePart
    // e.g. datePart.substring(8, 10) => "06"
    var dayNum = parseInt(datePart.substring(8, 10), 10); // 6

    // We'll do the same for end if you need to show end times
    // Otherwise you can skip it
    var endStr = ev.end.dateTime
      ? ev.end.dateTime
      : (ev.end.date + "T23:59:59");
    var baseEndStr = endStr.substring(0, 19);
    var endTimePart = baseEndStr.substring(11, 16);

    // ---- 3) Decide which day-cell to place it on using dayNum ----
    var cellIndex = startDay + dayNum - 1;
    var dayCells = calendarDaysEl.getElementsByClassName("day-cell");
    if (cellIndex < 0 || cellIndex >= dayCells.length) continue;

    // ---- 4) Save event data in dayEventsMap if you have a modal system ----
    var eventInfo = {
      summary: ev.summary || "(No Title)",
      // For the time, let's keep it as HH:MM from the string
      displayTime: timePart,
      // We might store the original date/time string if needed
      originalStart: startStr,
      endTime: endTimePart,
      calendarLabel: calendar.label,
      calendarColor: calendar.color
    };
    if (!dayEventsMap[dayNum]) {
      dayEventsMap[dayNum] = [];
    }
    dayEventsMap[dayNum].push(eventInfo);

    // ---- 5) Visually mark the cell (like a small “calendar.label” pill) ----
    var eventEl = document.createElement("div");
    eventEl.className = "event";
    eventEl.textContent = calendar.label;
    eventEl.style.borderLeft = "3px solid " + calendar.color;
    eventEl.style.background = "#fff";
    dayCells[cellIndex].appendChild(eventEl);
  }
}





  /** 
   * Modal handling 
   */
  var modalOverlay = document.getElementById("modal-overlay");
  var modalContent = document.getElementById("modal-content");
  var modalEventsList = document.getElementById("modal-events-list");
  var closeModalBtn = document.getElementById("close-modal");

  closeModalBtn.addEventListener("click", function() {
    closeModal();
  });

  modalOverlay.addEventListener("click", function(e) {
    // Close if user clicks outside the modal content
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  function openModal(dayNum) {
    // Clear existing list
    modalEventsList.innerHTML = "";

    // Retrieve events for that day
    var events = dayEventsMap[dayNum] || [];
    // Sort events by start time ascending
    events.sort(function(a, b) {
      return a.start - b.start;
    });

    // Build the event list
    for (var i = 0; i < events.length; i++) {
      var item = events[i];
      // Convert times to something readable
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

  // Helper to format time from Date objects
  function formatTime(dateObj) {
    var hours = dateObj.getHours();
    var minutes = dateObj.getMinutes();
    var hh = (hours < 10) ? "0" + hours : hours;
    var mm = (minutes < 10) ? "0" + minutes : minutes;
    return hh + ":" + mm;
  }

})();
