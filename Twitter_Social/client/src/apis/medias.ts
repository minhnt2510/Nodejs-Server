import type { ApiResponse, Media } from '../types'
import { http } from '../lib/http'

function readResult<T>(response: ApiResponse<T>) {
  if (!response.result) {
    throw new Error(response.message || 'Empty API response')
  }
  return response.result
}

function appendFiles(files: File[], fieldName: 'image' | 'video') {
  const formData = new FormData()
  files.forEach((file) => formData.append(fieldName, file))
  return formData
}

export const mediasApi = {
  async uploadImages(files: File[]) {
    const { data } = await http.post<ApiResponse<Media[]>>('/medias/upload-image', appendFiles(files, 'image'), {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return readResult(data)
  },

  async uploadVideo(file: File) {
    const { data } = await http.post<ApiResponse<Media[]>>('/medias/upload-video', appendFiles([file], 'video'), {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return readResult(data)
  }
}
