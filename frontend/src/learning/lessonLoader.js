const loaders = import.meta.glob('./lessons/*.js');

export function loadLesson(id) {
  const loader = loaders[`./lessons/${id}.js`];
  if (!loader) return Promise.reject(new Error('This lesson has no published content.'));
  return loader().then(module => module.default);
}
