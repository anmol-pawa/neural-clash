import python from "@/content/lessons/python-port.json";
import numpy from "@/content/lessons/numpy.json";

import linalg from "@/content/lessons/linalg.json";
import calculus from "@/content/lessons/calculus.json";
import probability from "@/content/lessons/probability.json";
import classic from "@/content/lessons/classic-grove.json";

export interface LessonSection { heading: string; text: string; code?: string[]; output?: string }
export interface Lesson { id: string; title: string; topics: string[]; intro: string; sections: LessonSection[]; takeaways: string[]; trap: string }

export const PYTHON_LESSONS: Lesson[] = python.lessons as Lesson[];
export const NUMPY_LESSONS: Lesson[] = numpy.lessons as Lesson[];
export const LINALG_LESSONS: Lesson[] = linalg.lessons as Lesson[];
export const CALCULUS_LESSONS: Lesson[] = calculus.lessons as Lesson[];
export const PROBABILITY_LESSONS: Lesson[] = probability.lessons as Lesson[];
export const CLASSIC_LESSONS: Lesson[] = classic.lessons as Lesson[];
export const LESSONS: Lesson[] = [...PYTHON_LESSONS, ...NUMPY_LESSONS, ...LINALG_LESSONS, ...CALCULUS_LESSONS, ...PROBABILITY_LESSONS, ...CLASSIC_LESSONS];

/** The lesson that teaches a card topic, if any. */
export function lessonForTopic(topic: string, lessons: Lesson[] = LESSONS): Lesson | undefined {
  return lessons.find((l) => l.topics.includes(topic));
}

export function lessonById(id: string, lessons: Lesson[] = LESSONS): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
