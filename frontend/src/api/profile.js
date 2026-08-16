import client from './client';

// Content-Type en undefined para que el navegador arme el boundary del multipart
const multipartConfig = { headers: { 'Content-Type': undefined } };

export function getMyProfile() {
  return client.get('/profile/me');
}

// payload: campos editables + opcionalmente profile_photo (File)
export function updateMyProfile(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'profile_photo') return;
    formData.append(key, value ?? '');
  });
  if (payload.profile_photo instanceof File) {
    formData.append('profile_photo', payload.profile_photo);
  }
  return client.put('/profile/me', formData, multipartConfig);
}

export function deleteMyPhoto() {
  return client.delete('/profile/me/photo');
}

export function changeMyPassword(currentPassword, newPassword) {
  return client.patch('/profile/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
