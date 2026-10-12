/*
 * MASAR BMW — IndexedDB offline storage.
 * Structured on-device database (NOT a remote sync service).
 * Educational content comes from the versioned, read-only course.json.
 */
(() => {
  'use strict';
  const DATABASE_NAME = 'masar-bmw-study';
  const DATABASE_VERSION = 6;
  const referenceStores = ['weeks', 'lessons', 'questions', 'sources', 'learning_visuals', 'media_resources', 'personal_documents', 'uploaded_image_index', 'external_study_sources', 'review_questions', 'practical_checklist', 'review_claims', 'lesson_reading_map', 'sign_library', 'lesson_activities'];
  const userStores = ['progress', 'answers', 'notes', 'bookmarks', 'attempts', 'visits', 'preferences'];
  const allStores = [...referenceStores, ...userStores, 'personal_files'];
  let dbPromise;
  let writeQueue = Promise.resolve();

  function connect() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const create = (name, keyPath, indexes = []) => {
          if (db.objectStoreNames.contains(name)) return;
          const store = db.createObjectStore(name, { keyPath });
          indexes.forEach(([field, unique]) => store.createIndex(field, field, { unique: !!unique }));
        };
        create('weeks', 'id', [['number', true]]);
        create('lessons', 'id', [['week_id', false], ['order', true]]);
        create('questions', 'id', [['lesson_id', true]]);
        create('sources', 'id');
        create('learning_visuals', 'id');
        create('media_resources', 'id');
        create('personal_documents', 'id');
        create('uploaded_image_index', 'id');
        create('external_study_sources', 'id');
        create('review_questions', 'id');
        create('practical_checklist', 'id');
        create('review_claims', 'id');
        create('lesson_reading_map', 'id');
        create('sign_library', 'id');
        create('lesson_activities', 'id');
        create('personal_files', 'id');
        create('progress', 'lesson_id');
        create('answers', 'question_id');
        create('notes', 'lesson_id');
        create('bookmarks', 'lesson_id');
        create('attempts', 'id');
        create('visits', 'lesson_id');
        create('preferences', 'key');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => { dbPromise = undefined; reject(request.error); };
      request.onblocked = () => console.warn('MASAR: IndexedDB upgrade blocked by another tab');
    });
    return dbPromise;
  }

  function completed(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Database transaction aborted'));
      tx.onerror = () => reject(tx.error || new Error('Database transaction failed'));
    });
  }
  function getAll(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function seedReference(course) {
    const db = await connect();
    const tx = db.transaction(referenceStores, 'readwrite');
    for (const name of referenceStores) {
      const store = tx.objectStore(name);
      store.clear();
      for (const item of course[name] || []) store.put(item);
    }
    await completed(tx);
    return { weeks: (course.weeks || []).length, lessons: (course.lessons || []).length,
      questions: (course.questions || []).length, sources: (course.sources || []).length,
      visuals: (course.learning_visuals || []).length, media: (course.media_resources || []).length };
  }

  async function loadUser() {
    const db = await connect();
    const tx = db.transaction(userStores, 'readonly');
    const results = await Promise.all(userStores.map(n => getAll(tx.objectStore(n))));
    await completed(tx);
    const [progress, answers, notes, bookmarks, attempts, visits, preferences] = results;
    const prefs = Object.fromEntries(preferences.map(item => [item.key, item.value]));
    if (!prefs.initialized) return null;
    return {
      done: progress.filter(x => x.completed).map(x => x.lesson_id),
      answers: Object.fromEntries(answers.map(x => [x.question_id, x.option_index])),
      notes: Object.fromEntries(notes.map(x => [x.lesson_id, x.body])),
      bookmarks: bookmarks.map(x => x.lesson_id),
      history: attempts.sort((a,b) => a.id-b.id).map(({id, ...attempt}) => attempt),
      visited: visits.map(x => x.lesson_id),
      lastOpened: prefs.lastOpened || 1,
      readingPositions: prefs.readingPositions || {},
      videoNotes: prefs.videoNotes || {},
      sourceNotes: prefs.sourceNotes || {},
      practiceChecks: prefs.practiceChecks || {},
      reviewAnswers: prefs.reviewAnswers || {},
      signPractice: prefs.signPractice || {},
      activityNotes: prefs.activityNotes || {},
      activityChecks: prefs.activityChecks || {},
      reviewHistory: prefs.reviewHistory || {},
      mockSession: prefs.mockSession || null,
      mockHistory: prefs.mockHistory || []
    };
  }

  async function doSave(snapshot) {
    const db = await connect();
    const tx = db.transaction(userStores, 'readwrite');
    for (const name of userStores) tx.objectStore(name).clear();
    for (const lesson_id of snapshot.done || []) tx.objectStore('progress').put({lesson_id: Number(lesson_id), completed: true});
    for (const [question_id, option_index] of Object.entries(snapshot.answers || {}))
      tx.objectStore('answers').put({question_id, option_index: Number(option_index)});
    for (const [lesson_id, body] of Object.entries(snapshot.notes || {}))
      if (body) tx.objectStore('notes').put({lesson_id: Number(lesson_id), body: String(body)});
    for (const lesson_id of snapshot.bookmarks || []) tx.objectStore('bookmarks').put({lesson_id: Number(lesson_id)});
    (snapshot.history || []).forEach((entry,id) => tx.objectStore('attempts').put({id, ...entry}));
    for (const lesson_id of snapshot.visited || []) tx.objectStore('visits').put({lesson_id: Number(lesson_id)});
    tx.objectStore('preferences').put({key: 'initialized', value: true});
    tx.objectStore('preferences').put({key: 'lastOpened', value: Number(snapshot.lastOpened) || 1});
    tx.objectStore('preferences').put({key: 'readingPositions', value: snapshot.readingPositions || {}});
    for (const key of ['videoNotes','sourceNotes','practiceChecks','reviewAnswers','signPractice','activityNotes','activityChecks','reviewHistory','mockSession','mockHistory']) tx.objectStore('preferences').put({key, value: snapshot[key] ?? (key==='mockHistory'?[]:key==='mockSession'?null:{})});
    await completed(tx);
  }

  function saveUser(snapshot) {
    // Snapshot eagerly; subsequent UI mutations must not alter an in-flight transaction.
    const copied = JSON.parse(JSON.stringify(snapshot));
    writeQueue = writeQueue.catch(() => {}).then(() => doSave(copied));
    return writeQueue;
  }

  async function savePersonalFile(id, file) {
    if (!id || !file || !/^(application\/pdf|image\/(png|jpeg|webp))$/.test(file.type)) throw new Error('Unsupported file type');
    const db = await connect();
    const tx = db.transaction(['personal_files'], 'readwrite');
    tx.objectStore('personal_files').put({id, filename:file.name, mime:file.type, size:file.size, updatedAt:new Date().toISOString(), blob:file});
    await completed(tx);
  }
  async function getPersonalFile(id) {
    const db = await connect();
    return new Promise((resolve,reject) => {
      const req = db.transaction('personal_files','readonly').objectStore('personal_files').get(id);
      req.onsuccess=()=>resolve(req.result || null);req.onerror=()=>reject(req.error);
    });
  }
  async function listPersonalFiles() {
    const db = await connect();
    const tx = db.transaction('personal_files','readonly');
    const result = await getAll(tx.objectStore('personal_files'));
    await completed(tx);
    return result.map(({blob,...meta})=>meta);
  }
  async function deletePersonalFile(id) {
    const db = await connect();
    const tx = db.transaction(['personal_files'], 'readwrite');
    tx.objectStore('personal_files').delete(id);
    await completed(tx);
  }
  window.MasarDB = Object.freeze({name: DATABASE_NAME, connect, seedReference, loadUser, saveUser, savePersonalFile, getPersonalFile, listPersonalFiles, deletePersonalFile,
    stores: Object.freeze(allStores.slice())});
})();
