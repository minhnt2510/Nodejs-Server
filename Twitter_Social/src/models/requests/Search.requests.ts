import { Query } from 'express-serve-static-core'
import { MediaQueryType, PeopleFollow } from '~/constants/enums'

export interface SearchQuery extends Query {
  content: string
  limit: string
  page: string
  media_type?: MediaQueryType
  people_follow?: PeopleFollow
}
