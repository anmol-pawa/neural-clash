import python from "@/content/lessons/python-port.json";
import numpy from "@/content/lessons/numpy.json";

export interface LessonSection { heading: string; text: string; code?: string[]; output?: string }
export interface Lesson { id: string; title: string; topics: string[]; intro: string; sections: LessonSection[]; takeaways: string[]; trap: string }

export const PYTHON_LESSONS: Lesson[] = python.lessons as Lesson[];
export const NUMPY_LESSONS: Lesson[] = numpy.lessons as Lesson[];
export const LESSONS: Lesson[] = [...PYTHON_LESSONS, ...NUMPY_LESSONS];

/** The lesson that teaches a card topic, if any. */
export function lessonForTopic(topic: string, lessons: Lesson[] = LESSONS): Lesson | undefined {
  return lessons.find((l) => l.topics.includes(topic));
}

export function lessonById(id: string, lessons: Lesson[] = LESSONS): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
