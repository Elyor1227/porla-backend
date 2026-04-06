/**
 * Dars videosi uchun clientga beriladigan URL (yuklangan fayl yoki tashqi havola)
 */

const { PUBLIC_API_URL } = require("../config/constants");

/**
 * @param {object} lessonObj - Lesson.toObject() yoki { _id, videoFile, videoUrl }
 * @param {string} courseIdStr
 * @returns {string}
 */
function toClientVideoUrl(lessonObj, courseIdStr) {
  if (lessonObj.videoFile) {
    const rel = `/api/courses/${courseIdStr}/lessons/${lessonObj._id}/video`;
    return PUBLIC_API_URL ? `${PUBLIC_API_URL}${rel}` : rel;
  }
  return lessonObj.videoUrl || "";
}

module.exports = { toClientVideoUrl };
