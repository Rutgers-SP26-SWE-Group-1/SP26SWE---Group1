type RutgersCampusCode = 'NB' | 'NK' | 'CM';

type RutgersCourseQuery = {
  campus: RutgersCampusCode;
  dayFilter: string | null;
  keywords: string[];
  strictOpenOnly: boolean;
};

type RutgersCourseResult = {
  course: string;
  section: string;
  time: string;
  instructor: string;
  status: string;
  campus: string;
};

type RutgersWeatherQuery = {
  campus: RutgersCampusCode;
  timeframe: 'today' | 'tomorrow';
};

type RutgersWeatherResult = {
  location: string;
  temperature: string;
  conditions: string;
  suggestedClothing: string;
};

type RutgersToolRequest = {
  needsCourse: boolean;
  needsWeather: boolean;
  needsClothing: boolean;
  campus: RutgersCampusCode;
  courseQuery: RutgersCourseQuery;
  weatherQuery: RutgersWeatherQuery;
};

type RutgersToolResponse = {
  courseResults: RutgersCourseResult[];
  weatherResult: RutgersWeatherResult | null;
  courseError: string | null;
  weatherError: string | null;
  formatted: string;
};

type RutgersCourseApiMeeting = {
  campusName?: string;
  meetingDay?: string;
  startTime?: string;
  endTime?: string;
  pmCode?: string;
};

type RutgersCourseApiSection = {
  number?: string;
  index?: string;
  instructorsText?: string;
  openStatus?: boolean;
  openStatusText?: string;
  campusCode?: string;
  sectionCampusLocations?: Array<{ description?: string }>;
  meetingTimes?: RutgersCourseApiMeeting[];
};

type RutgersCourseApiCourse = {
  courseString?: string;
  courseNumber?: string;
  title?: string;
  expandedTitle?: string;
  subjectDescription?: string;
  courseDescription?: string;
  sections?: RutgersCourseApiSection[];
};

const CAMPUS_CONFIG: Record<RutgersCampusCode, { label: string; location: string; latitude: number; longitude: number }> = {
  NB: {
    label: 'New Brunswick',
    location: 'New Brunswick, NJ',
    latitude: 40.4862,
    longitude: -74.4518,
  },
  NK: {
    label: 'Newark',
    location: 'Newark, NJ',
    latitude: 40.7357,
    longitude: -74.1724,
  },
  CM: {
    label: 'Camden',
    location: 'Camden, NJ',
    latitude: 39.9429,
    longitude: -75.1196,
  },
};

const SUBJECT_ALIASES = [
  { keywords: ['cs', 'computer science'], code: '198' },
  { keywords: ['math', 'mathematics'], code: '640' },
];

const STOP_WORDS = new Set([
  'a',
  'about',
  'and',
  'are',
  'at',
  'available',
  'class',
  'classes',
  'course',
  'courses',
  'find',
  'for',
  'if',
  'in',
  'intro',
  'is',
  'it',
  'monday',
  'of',
  'on',
  'open',
  'rutgers',
  'search',
  'semester',
  'tell',
  'the',
  'this',
  'to',
  'tomorrow',
  'today',
  'weather',
  'what',
]);

const DAY_MAP: Record<string, string> = {
  monday: 'M',
  tuesday: 'T',
  wednesday: 'W',
  thursday: 'H',
  friday: 'F',
  saturday: 'S',
  sunday: 'U',
};

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear skies',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Moderate rain showers',
  82: 'Heavy rain showers',
  95: 'Thunderstorms',
};

function normalizeMessage(message: string) {
  return message.trim().toLowerCase();
}

function detectCampus(message: string): RutgersCampusCode {
  const normalized = normalizeMessage(message);

  if (normalized.includes('newark')) {
    return 'NK';
  }

  if (normalized.includes('camden')) {
    return 'CM';
  }

  return 'NB';
}

function detectDayFilter(message: string) {
  const normalized = normalizeMessage(message);

  for (const [day, code] of Object.entries(DAY_MAP)) {
    if (normalized.includes(day)) {
      return code;
    }
  }

  return null;
}

function detectWeatherTimeframe(message: string): 'today' | 'tomorrow' {
  return normalizeMessage(message).includes('tomorrow') ? 'tomorrow' : 'today';
}

function buildCourseKeywords(message: string) {
  const normalized = normalizeMessage(message);
  const tokens = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));

  const subjectCodes = SUBJECT_ALIASES
    .filter((alias) => alias.keywords.some((keyword) => normalized.includes(keyword)))
    .map((alias) => alias.code);

  const keywords = Array.from(new Set(tokens));

  return {
    subjectCodes,
    keywords,
  };
}

function getCurrentRutgersTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;

  if (month >= 9) {
    return { year: now.getFullYear(), term: 9 };
  }

  if (month >= 6) {
    return { year: now.getFullYear(), term: 7 };
  }

  return { year: now.getFullYear(), term: 1 };
}

function toStandardTime(value?: string, pmCode?: string) {
  if (!value || value.length !== 4) {
    return 'TBA';
  }

  const hours = Number.parseInt(value.slice(0, 2), 10);
  const minutes = value.slice(2);
  const normalizedHours = hours % 12 || 12;
  const suffix = pmCode === 'P' || hours >= 12 ? 'PM' : 'AM';

  return `${normalizedHours}:${minutes} ${suffix}`;
}

function formatMeetingTimes(meetings: RutgersCourseApiMeeting[] | undefined, dayFilter: string | null) {
  if (!meetings || meetings.length === 0) {
    return 'Time TBA';
  }

  const filtered = dayFilter
    ? meetings.filter((meeting) => meeting.meetingDay === dayFilter)
    : meetings;

  if (filtered.length === 0) {
    return 'No meetings on requested day';
  }

  return filtered
    .map((meeting) => {
      const day = meeting.meetingDay ?? 'Day TBA';
      const start = toStandardTime(meeting.startTime, meeting.pmCode);
      const end = toStandardTime(meeting.endTime, meeting.pmCode);
      const campus = meeting.campusName ? ` @ ${meeting.campusName}` : '';
      return `${day} ${start} - ${end}${campus}`;
    })
    .join('; ');
}

function scoreCourse(course: RutgersCourseApiCourse, keywords: string[], subjectCodes: string[]) {
  const haystack = [
    course.title,
    course.expandedTitle,
    course.courseDescription,
    course.subjectDescription,
    course.courseString,
    course.courseNumber,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) {
      score += 2;
    }
  }

  if (subjectCodes.length > 0 && subjectCodes.includes(course.courseString?.split(':')[1] ?? '')) {
    score += 5;
  }

  if (haystack.includes('artificial intelligence') || haystack.includes('ai')) {
    score += 2;
  }

  return score;
}

function buildClothingSuggestion(
  temperatureCelsius: number,
  conditions: string,
  precipitationProbability = 0,
  windKph = 0
) {
  const suggestions: string[] = [];

  if (temperatureCelsius <= 5) {
    suggestions.push('wear a warm coat');
  } else if (temperatureCelsius <= 12) {
    suggestions.push('bring a jacket');
  } else if (temperatureCelsius >= 26) {
    suggestions.push('wear light clothes');
  } else {
    suggestions.push('dress in light layers');
  }

  if (precipitationProbability >= 35 || conditions.toLowerCase().includes('rain')) {
    suggestions.push('pack an umbrella or rain jacket');
  }

  if (windKph >= 20) {
    suggestions.push('add an extra layer for the wind');
  }

  if (temperatureCelsius >= 24) {
    suggestions.push('bring water and sunscreen');
  }

  return suggestions.join('; ');
}

function formatCourseSection(course: RutgersCourseApiCourse, section: RutgersCourseApiSection, dayFilter: string | null): RutgersCourseResult {
  const primaryCampus =
    section.sectionCampusLocations?.[0]?.description ??
    section.meetingTimes?.[0]?.campusName ??
    CAMPUS_CONFIG[section.campusCode as RutgersCampusCode]?.label ??
    'Campus TBA';

  return {
    course: `${course.courseString ?? 'Course'} ${course.title ?? ''}`.trim(),
    section: `${section.number ?? 'TBA'}${section.index ? ` (Index ${section.index})` : ''}`,
    time: formatMeetingTimes(section.meetingTimes, dayFilter),
    instructor: section.instructorsText || 'Instructor TBA',
    status: section.openStatusText || (section.openStatus ? 'OPEN' : 'CLOSED'),
    campus: primaryCampus,
  };
}

export function detectRutgersToolRequest(message: string): RutgersToolRequest {
  const normalized = normalizeMessage(message);
  const needsCourse =
    normalized.includes('rutgers') &&
    (normalized.includes('course') ||
      normalized.includes('courses') ||
      normalized.includes('class') ||
      normalized.includes('classes') ||
      normalized.includes('section') ||
      normalized.includes('semester') ||
      normalized.includes('open') ||
      normalized.includes('available'));
  const needsWeather =
    normalized.includes('weather') ||
    normalized.includes('forecast') ||
    normalized.includes('temperature') ||
    normalized.includes('wear') ||
    normalized.includes('cold') ||
    normalized.includes('hot') ||
    normalized.includes('rain') ||
    normalized.includes('windy') ||
    normalized.includes('tomorrow') ||
    normalized.includes('today');
  const needsClothing =
    normalized.includes('wear') || normalized.includes('clothing');
  const campus = detectCampus(message);
  const { keywords } = buildCourseKeywords(message);

  return {
    needsCourse,
    needsWeather,
    needsClothing,
    campus,
    courseQuery: {
      campus,
      dayFilter: detectDayFilter(message),
      keywords,
      strictOpenOnly:
        normalized.includes('find open') || normalized.includes('available'),
    },
    weatherQuery: {
      campus,
      timeframe: detectWeatherTimeframe(message),
    },
  };
}

export function getRutgersLoadingState(message: string) {
  const request = detectRutgersToolRequest(message);

  if (request.needsCourse && request.needsWeather) {
    return {
      title: 'Gathering Rutgers courses and weather...',
      detail: 'Checking live course availability and forecast data.',
    };
  }

  if (request.needsCourse) {
    return {
      title: 'Searching Rutgers courses...',
      detail: 'Looking up live section availability and meeting times.',
    };
  }

  if (request.needsWeather) {
    return {
      title: 'Checking Rutgers weather...',
      detail: 'Pulling the latest forecast and clothing advice.',
    };
  }

  return null;
}

async function fetchRutgersCourses(query: RutgersCourseQuery) {
  const { year, term } = getCurrentRutgersTerm();
  const url = `https://classes.rutgers.edu/soc/api/courses.json?year=${year}&term=${term}&campus=${query.campus}`;
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error('Rutgers course data is unavailable right now.');
  }

  const courses = (await response.json()) as RutgersCourseApiCourse[];
  const { subjectCodes } = buildCourseKeywords(query.keywords.join(' '));
  const effectiveSubjectCodes = subjectCodes.length > 0 ? subjectCodes : [];
  const effectiveKeywords = query.keywords;

  const matchedCourses = courses
    .map((course) => ({
      course,
      score: scoreCourse(course, effectiveKeywords, effectiveSubjectCodes),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const sections = matchedCourses
    .flatMap(({ course }) =>
      (course.sections ?? [])
        .filter((section) => !query.strictOpenOnly || section.openStatus === true)
        .filter((section) =>
          query.dayFilter
            ? (section.meetingTimes ?? []).some((meeting) => meeting.meetingDay === query.dayFilter)
            : true
        )
        .map((section) => formatCourseSection(course, section, query.dayFilter))
    )
    .slice(0, 5);

  return sections;
}

async function fetchRutgersWeather(query: RutgersWeatherQuery): Promise<RutgersWeatherResult> {
  const campus = CAMPUS_CONFIG[query.campus];
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${campus.latitude}&longitude=${campus.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=America%2FNew_York&forecast_days=2`,
    {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    throw new Error('Weather data is unavailable.');
  }

  const data = await response.json() as {
    current?: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
    daily?: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      weather_code: number[];
      precipitation_probability_max: number[];
    };
  };

  const forecastIndex = query.timeframe === 'tomorrow' ? 1 : 0;
  const dailyWeatherCode = data.daily?.weather_code?.[forecastIndex] ?? data.current?.weather_code ?? 0;
  const dailyMax = data.daily?.temperature_2m_max?.[forecastIndex];
  const dailyMin = data.daily?.temperature_2m_min?.[forecastIndex];
  const precipitationProbability = data.daily?.precipitation_probability_max?.[forecastIndex] ?? 0;
  const currentTemperature = data.current?.temperature_2m ?? dailyMax ?? 0;
  const conditions = WEATHER_CODES[dailyWeatherCode] ?? 'Conditions unavailable';
  const clothing = buildClothingSuggestion(
    query.timeframe === 'tomorrow' && typeof dailyMin === 'number'
      ? (Number(dailyMax ?? currentTemperature) + Number(dailyMin)) / 2
      : currentTemperature,
    conditions,
    precipitationProbability,
    data.current?.wind_speed_10m ?? 0
  );

  const temperature =
    query.timeframe === 'tomorrow' && typeof dailyMax === 'number' && typeof dailyMin === 'number'
      ? `High ${Math.round((dailyMax * 9) / 5 + 32)}°F / Low ${Math.round((dailyMin * 9) / 5 + 32)}°F`
      : `${Math.round((currentTemperature * 9) / 5 + 32)}°F`;

  return {
    location: campus.location,
    temperature,
    conditions,
    suggestedClothing: clothing,
  };
}

function formatCourseResults(courseResults: RutgersCourseResult[], error: string | null) {
  if (error) {
    return ['Rutgers Course Results:', `- ${error}`].join('\n');
  }

  if (courseResults.length === 0) {
    return ['Rutgers Course Results:', '- No matching Rutgers courses were found.'].join('\n');
  }

  return [
    'Rutgers Course Results:',
    ...courseResults.flatMap((result) => [
      `- Course: ${result.course}`,
      `- Section: ${result.section}`,
      `- Time: ${result.time}`,
      `- Instructor: ${result.instructor}`,
      `- Status: ${result.status}`,
      `- Campus: ${result.campus}`,
      '',
    ]),
  ]
    .join('\n')
    .trim();
}

function formatWeatherResult(weatherResult: RutgersWeatherResult | null, error: string | null) {
  if (error || !weatherResult) {
    return ['Rutgers Weather:', `- ${error || 'Weather data is unavailable.'}`].join('\n');
  }

  return [
    'Rutgers Weather:',
    `- Location: ${weatherResult.location}`,
    `- Temperature: ${weatherResult.temperature}`,
    `- Conditions: ${weatherResult.conditions}`,
    `- Suggested clothing: ${weatherResult.suggestedClothing}`,
  ].join('\n');
}

function buildRecommendation(courseResults: RutgersCourseResult[], weatherResult: RutgersWeatherResult | null, needsClothing: boolean) {
  const pieces: string[] = [];

  if (courseResults.length > 0) {
    pieces.push('Check the open section details and register quickly if a seat fits your schedule.');
  }

  if (weatherResult) {
    pieces.push(weatherResult.suggestedClothing);
  }

  if (needsClothing && !weatherResult) {
    pieces.push('Weather data is unavailable, so check the forecast again before you head out.');
  }

  return pieces.join(' ');
}

export async function handleRutgersCourseWeatherRequest(message: string): Promise<RutgersToolResponse> {
  const request = detectRutgersToolRequest(message);
  const coursePromise = request.needsCourse
    ? fetchRutgersCourses(request.courseQuery)
    : Promise.resolve([]);
  const weatherPromise = request.needsWeather
    ? fetchRutgersWeather(request.weatherQuery)
    : Promise.resolve(null);

  const [courseResult, weatherResult] = await Promise.allSettled([coursePromise, weatherPromise]);

  const courseResults = courseResult.status === 'fulfilled' ? courseResult.value : [];
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const courseError =
    request.needsCourse && courseResult.status === 'rejected'
      ? 'Rutgers course data is unavailable right now.'
      : null;
  const weatherError =
    request.needsWeather && weatherResult.status === 'rejected'
      ? 'Weather data is unavailable.'
      : null;

  const sections: string[] = [];

  if (request.needsCourse) {
    sections.push(formatCourseResults(courseResults, courseError));
  }

  if (request.needsWeather) {
    sections.push(formatWeatherResult(weather, weatherError));
  }

  if (request.needsCourse && request.needsWeather) {
    sections.push(`Recommendation:\n${buildRecommendation(courseResults, weather, request.needsClothing) || 'Review the live results above before you head out.'}`);
  }

  return {
    courseResults,
    weatherResult: weather,
    courseError,
    weatherError,
    formatted: sections.join('\n\n'),
  };
}
