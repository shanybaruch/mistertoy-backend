
import fs from 'fs'
import { utilService } from './util.service.js'
import { loggerService } from './logger.service.js'

export const toyService = {
    query,
    getById,
    remove,
    save
}

const PAGE_SIZE = 5
const toys = utilService.readJsonFile('data/toy.json')

function query(filterBy = { txt: '' }) {
    const regex = new RegExp(filterBy.txt, 'i')
    var toysToReturn = toys.filter(toy => regex.test(toy.name))

    if (filterBy.maxPrice) {
        toysToReturn = toysToReturn.filter(toy => toy.price <= filterBy.maxPrice)
    }
    if (filterBy.inStock === 'true') {
        toysToReturn = toysToReturn.filter(toy => toy.inStock)
    }
    if (filterBy.sortBy) {
        if (filterBy.sortBy === 'price') {
            toysToReturn.sort((t1, t2) => t1.price - t2.price)
        } else if (filterBy.sortBy === 'createdAt') {
            toysToReturn.sort((t1, t2) => t1.createdAt - t2.createdAt)
        } else if (filterBy.sortBy === 'txt') {
            toysToReturn.sort((t1, t2) => t1.name.localeCompare(t2.name))
        }
    }
    const maxPage = Math.ceil(toysToReturn.length / PAGE_SIZE)

    if (filterBy.pageIdx !== undefined) {
        const pageIdx = filterBy.pageIdx
        const startIdx = pageIdx * PAGE_SIZE        
      
        toysToReturn = toysToReturn.slice(startIdx, startIdx + PAGE_SIZE)
    }

    return Promise.resolve({ toys: toysToReturn, maxPage })
}

function getById(toyId) {
    const toy = toys.find(toy => toy._id === toyId)
    return Promise.resolve(toy)
}

function remove(toyId, loggedinUser) {
    const idx = toys.findIndex(toy => toy._id === toyId)
    if (idx === -1) return Promise.reject('No Such Toy')

    const toy = toys[idx]
    if (!loggedinUser.isAdmin &&
        toy.owner._id !== loggedinUser._id) {
        return Promise.reject('Not your toy')
    }
    toys.splice(idx, 1)
    return _saveToysToFile()
}

function save(toy, loggedinUser) {
    if (toy._id) {
        const toyToUpdate = toys.find(currToy => currToy._id === toy._id)
        if (!loggedinUser.isAdmin &&
            toyToUpdate.owner._id !== loggedinUser._id) {
            return Promise.reject('Not your toy')
        }
        toyToUpdate.name = toy.name
        toyToUpdate.price = toy.price
        if (toy.imgUrl) toyToUpdate.imgUrl = toy.imgUrl

        toy = toyToUpdate
    } else {
        toy._id = utilService.makeId()
        toy.owner = loggedinUser
        toy.createdAt = Date.now()
        toy.inStock = Math.random() < 0.5

        const uniqueStr = toy.name || toy._id || 'default-toy';
        toy.imgUrl = toy.imgUrl || `https://robohash.org/${uniqueStr}?set=set4`;

        if (!toy.labels) toy.labels = []
        toys.push(toy)
    }
    delete toy.owner.score
    return _saveToysToFile().then(() => toy)
}


function _saveToysToFile() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(toys, null, 2)
        fs.writeFile('data/toy.json', data, (err) => {
            if (err) {
                loggerService.error('Cannot write to toys file', err)
                return reject(err)
            }
            resolve()
        })
    })
}