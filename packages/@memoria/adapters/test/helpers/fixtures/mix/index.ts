const PHOTOS = [
  {
    id: 1,
    name: "Ski trip",
    href: "ski-trip.jpeg",
    is_public: false,
  },
  {
    id: 2,
    name: "Family photo",
    href: "family-photo.jpeg",
    is_public: true,
  },
  {
    id: 3,
    name: "Selfie",
    href: "selfie.jpeg",
    is_public: false,
  },
]
const PHOTO_COMMENTS = [
  {
    uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
    content: "What a nice photo!",
    inserted_at: "2015-10-25T20:54:04.447Z",
    updated_at: "2015-10-25T20:54:04.447Z",
    photo_id: 1,
    user_id: 1,
  },
  {
    uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
    content: "I agree",
    inserted_at: "2015-10-25T20:54:04.447Z",
    updated_at: "2015-10-25T20:54:04.447Z",
    photo_id: 1,
    user_id: 2,
  },
  {
    uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
    content: "I was kidding",
    inserted_at: "2015-10-25T20:54:04.447Z",
    updated_at: "2015-10-25T20:54:04.447Z",
    photo_id: 1,
    user_id: 1,
  },
  {
    uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    content: "Interesting indeed",
    inserted_at: "2015-10-25T20:54:04.447Z",
    updated_at: "2015-10-25T20:54:04.447Z",
    photo_id: 2,
    user_id: 1,
  },
];

export default Object.freeze({
  PHOTOS: Object.freeze(PHOTOS.map((x) => Object.freeze(x))),
  PHOTO_COMMENTS: Object.freeze(PHOTO_COMMENTS.map((x) => Object.freeze(x)))
});
