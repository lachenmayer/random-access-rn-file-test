import React, { Component } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import randomAccessTest from 'random-access-test'
import test from 'tape'

//
// random-access-rn-file
//
import randomAccess from 'random-access-storage'
import RNFS from 'react-native-fs'
import pathAPI from 'path'

async function open(name) {
  await ensureFileFolder(name)

  const exists = await RNFS.exists(name)
  if (!exists) {
    await RNFS.writeFile(name, '', 'utf8')
  }
}

async function ensureFileFolder(name) {
  const dir = pathAPI.dirname(name)

  const exists = await RNFS.exists(dir)

  if(!exists) await ensureFileFolder(dir)

  await RNFS.mkdir(dir)
}

function fileReader(name) {
  return randomAccess({
    open(req) {
      open(name).then(
        () => {
          req.callback(null)
        },
        err => {
          req.callback(err)
        }
      )
    },
    read(req) {
      RNFS.read(name, req.size, req.offset, 'base64').then(
        data => {
          const buffer = Buffer.from(data, 'base64')
          if(buffer.length !== req.size) {
            req.callback(new Error('Ranger not satisfiable'))
          } else {
            req.callback(null, buffer)
          }
        },
        err => {
          req.callback(err)
        }
      )
    },
    write(req) {
      const data = req.data.toString('base64')
      RNFS.write(name, data, req.offset, 'base64').then(
        () => {
          req.callback(null)
        },
        err => {
          req.callback(err)
        }
      )
    },
  })
}
//
// end random-access-rn-file
//

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = { chunks: [], err: null }
    this.randomId = ('' + Math.random()).substr(2, 6)
  }

  componentDidMount() {

    test
      .createStream()
      .on('data', data => {
        this.setState(({ chunks }) => ({ chunks: chunks.concat(data) }))
      })
      .on('error', err => {
        this.setState({ err })
      })
    randomAccessTest(
      (name, options, callback) => {
        const file = `${RNFS.DocumentDirectoryPath}/${this.randomId}-${name}`
        callback(fileReader(file))
      },
      {
        reopen: true,
        content: false,
        del: false,
        writable: false,
        size: false,
        truncate: false,
      }
    )
  }

  render() {
    const { err, chunks } = this.state
    return (
      <View style={styles.container}>
        {err != null ? <Text>error: {err.message}</Text> : null}
        <FlatList
          data={chunks}
          renderItem={({ item }) => <Text>{item}</Text>}
          keyExtractor={(_, i) => '' + i}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
})
