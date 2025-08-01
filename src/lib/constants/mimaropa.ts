import type { ProvinceUnit } from '../types/database'

// MIMAROPA Organizational Structure
export const MIMAROPA_STRUCTURE = {
  'Oriental Mindoro PPO': {
    name: 'Oriental Mindoro PPO',
    capital: 'Calapan City',
    subUnits: [
      '1st PMFC',
      '2nd PMFC',
      'Calapan CPS',
      'Baco MPS',
      'Bansud MPS',
      'Bongabong MPS',
      'Bulalacao MPS',
      'Gloria MPS',
      'Mansalay MPS',
      'Naujan MPS',
      'Pinamalayan MPS',
      'Pola MPS',
      'Puerto Galera MPS',
      'Roxas MPS',
      'San Teodoro MPS',
      'Socorro MPS',
      'Victoria MPS'
    ]
  },
  'Occidental Mindoro PPO': {
    name: 'Occidental Mindoro PPO',
    capital: 'Mamburao',
    subUnits: [
      '1st PMFC',
      '2nd PMFC',
      'Abra De Ilog MPS',
      'Calintaan MPS',
      'Looc MPS',
      'Lubang MPS',
      'Magsaysay MPS',
      'Mamburao MPS',
      'Paluan MPS',
      'Rizal MPS',
      'Sablayan MPS',
      'San Jose MPS',
      'Sta Cruz MPS'
    ]
  },
  'Marinduque PPO': {
    name: 'Marinduque PPO',
    capital: 'Boac',
    subUnits: [
      '1st PMFP',
      '2nd PMFP',
      'Boac MPS',
      'Buenavista MPS',
      'Gasan MPS',
      'Mogpog MPS',
      'Sta Cruz MPS',
      'Torrijos MPS'
    ]
  },
  'Romblon PPO': {
    name: 'Romblon PPO',
    capital: 'Romblon',
    subUnits: [
      'Romblon PMFC',
      'Alcantara MPS',
      'Banton MPS',
      'Cajiocan MPS',
      'Calatrava MPS',
      'Concenpcion MPS',
      'Corcuera MPS',
      'Ferrol MPS',
      'Looc MPS',
      'Magdiwang MPS',
      'Odiongan MPS',
      'Romblon MPS',
      'San Agustin MPS',
      'San Andres MPS',
      'San Fernando MPS',
      'San Jose MPS',
      'Sta Fe MPS',
      'Sta Maria MPS'
    ]
  },
  'Palawan PPO': {
    name: 'Palawan PPO',
    capital: 'Puerto Princesa City',
    subUnits: [
      '1st PMFC',
      '2nd PMFC',
      'Aborlan MPS',
      'Agutaya MPS',
      'Araceli MPS',
      'Balabac MPS',
      'Bataraza MPS',
      'Brooke\'s Point MPS',
      'Busuanga MPS',
      'Cagayancillo MPS',
      'Coron MPS',
      'Culion MPS',
      'Cuyo MPS',
      'Dumaran MPS',
      'El Nido MPS',
      'Española MPS',
      'Kalayaan MPS',
      'Linapacan MPS',
      'Magsaysay MPS',
      'Narra MPS',
      'Quezon MPS',
      'Rizal MPS',
      'Roxas MPS',
      'San Vicente MPS',
      'Taytay MPS'
    ]
  },
  'Puerto Princesa CPO': {
    name: 'Puerto Princesa CPO',
    capital: 'Puerto Princesa City',
    subUnits: [
      'Puerto Princesa CMFC',
      'Police Station 1 (Mendoza)',
      'Police Station 2 (Irawan)',
      'Police Station 3',
      'Police Station 4',
      'Police Station 5'
    ]
  },
  'RMFB': {
    name: 'RMFB (Regional Mobile Force Battalion)',
    capital: 'Puerto Princesa City',
    subUnits: [
      'TSC',
      '401st Company',
      '402nd Company',
      '403rd Company',
      '404th Company',
      '405th Company'
    ]
  }
} as const

// Helper functions
export const getProvinceSubUnits = (province: ProvinceUnit): string[] => {
  const provinceData = MIMAROPA_STRUCTURE[province as keyof typeof MIMAROPA_STRUCTURE]
  return provinceData ? [...provinceData.subUnits] : []
}

export const getAllSubUnits = (): { province: ProvinceUnit; subUnit: string }[] => {
  const result: { province: ProvinceUnit; subUnit: string }[] = []
  
  Object.entries(MIMAROPA_STRUCTURE).forEach(([province, data]) => {
    data.subUnits.forEach(subUnit => {
      result.push({ province: province as ProvinceUnit, subUnit })
    })
  })
  
  return result
}

export const getTotalSubUnitsCount = (): number => {
  return Object.values(MIMAROPA_STRUCTURE).reduce((total, province) => {
    return total + province.subUnits.length
  }, 0)
}

// PNP Ranks
export const PNP_RANKS = [
  'Police Officer I',
  'Police Officer II',
  'Police Officer III',
  'Senior Police Officer I',
  'Senior Police Officer II',
  'Senior Police Officer III',
  'Senior Police Officer IV',
  'Police Master Sergeant',
  'Police Chief Master Sergeant',
  'Police Executive Master Sergeant',
  'Police Lieutenant',
  'Police Captain',
  'Police Major',
  'Police Lieutenant Colonel',
  'Police Colonel',
  'Police Brigadier General',
  'Police Major General',
  'Police Lieutenant General',
  'Police General'
] as const

export type PNPRank = typeof PNP_RANKS[number]
