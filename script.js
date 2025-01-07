var CALENDARS = [
  {
    id: "ronward.english@gmail.com",
    label: "BS",
    color: "blue"
  },
  {
    id: "c_1au77uvsbhjjkbbn0u0o1nvfdo@group.calendar.google.com",
    label: "TM",
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
      var startStr = ev.start.date || ev.start.dateTime;
      var eventDate = new Date(startStr);
      var day = eventDate.getDate();

      var cellIndex = startDay + day - 1;
      var dayCells = calendarDaysEl.getElementsByClassName("day-cell");

      if (cellIndex >= 0 && cellIndex < dayCells.length) {
        var eventEl = document.createElement("div");
        eventEl.className = "event";
        eventEl.textContent = calendar.label;
        eventEl.style.borderLeft = "3px solid " + calendar.color;
        eventEl.style.background = "#fff";

        dayCells[cellIndex].appendChild(eventEl);
      }
    }
  }
})();
