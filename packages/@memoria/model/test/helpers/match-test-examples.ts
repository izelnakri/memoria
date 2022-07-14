export default {
  id: 1,
  name: 'Some',
  active: true,
  createdAt: new Date('1985-12-10'),
  tags: ['teacher', 'happy'],
  meta: { new: true },
  relatedModel: {
    id: 7,
    name: 'Seventh',
    active: true,
    createdAt: new Date('2055-11-10'),
    tags: undefined,
    meta: { age: 33 },
    relatedModel: {
      id: 2,
      name: 'Second',
      active: null,
      createdAt: new Date('1985-12-10'),
      tags: ['old', 'happy'],
      meta: { new: true }
    },
    relatedModels: [
      {
        id: 2,
        name: 'Second',
        active: null,
        createdAt: new Date('1985-12-10'),
        tags: ['old', 'happy'],
        meta: { new: true }
      },
      {
        id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
      }
    ]
  },
  relatedModels: [
    {
      id: 7,
      name: 'Seventh',
      active: true,
      createdAt: new Date('2055-11-10'),
      tags: undefined,
      meta: { age: 33 },
      relatedModel: {
        id: 2,
        name: 'Second',
        active: null,
        createdAt: new Date('1985-12-10'),
        tags: ['old', 'happy'],
        meta: { new: true }
      },
      relatedModels: [
        {
          id: 2,
          name: 'Second',
          active: null,
          createdAt: new Date('1985-12-10'),
          tags: ['old', 'happy'],
          meta: { new: true }
        },
        {
          id: 5,
          name: 'Some',
          active: false,
          createdAt: new Date('2055-11-10'),
          tags: [],
          meta: undefined
        }
      ]
    },
    {
      id: 2,
      name: 'Second',
      active: null,
      createdAt: new Date('1985-12-10'),
      tags: ['old', 'happy'],
      meta: { new: true }
    },
    {
      id: 5,
      name: 'Some',
      active: false,
      createdAt: new Date('2055-11-10'),
      tags: [],
      meta: undefined
    }
  ]
};
