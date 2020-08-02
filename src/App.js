import React, { useEffect, useReducer } from "react";
// Amplify imports
import { API } from "aws-amplify";
import { listNotes } from "./graphql/queries";
import { createNote as CreateNote } from "./graphql/mutations";
// Ant Design imports
import { List, Input, Button } from "antd";
import "antd/dist/antd.css";
// misc imports
import { v4 as uuid } from "uuid";

const CLIENT_ID = uuid();

const styles = {
  container: { padding: 20 },
  input: { marginBottom: 10, maxWidth: 300 },
  item: {
    textAlign: "left",
  },
  p: { color: "#12890ff" },
};

// initialize state
const initialState = {
  notes: [], // from API
  error: false,
  loading: true, // display loading icon in UI
  form: {
    name: "",
    description: "",
  },
};

function App() {
  // state
  const [state, dispatch] = useReducer(reducer, initialState);

  // reducer for useReducer hook
  function reducer(state, action) {
    switch (action.type) {
      case "SET_NOTES":
        return { ...state, notes: action.notes, loading: false };
      case "ERROR":
        return { ...state, error: true, loading: false };
      case "ADD_NOTE":
        return { ...state, notes: [...state.notes, action.note] };
      case "RESET_FORM":
        return { ...state, form: initialState.form };
      case "SET_INPUT":
        return {
          ...state,
          form: { ...state.form, [action.name]: action.value },
        };
      default:
        return state;
    }
  }

  // get all notes from graphQL API
  async function fetchNotes() {
    try {
      const results = await API.graphql({
        query: listNotes,
      });
      console.log(results.data);
      dispatch({ type: "SET_NOTES", notes: results.data.listNotes.items });
    } catch (err) {
      console.log("error: ", err);
      dispatch({ type: "ERROR" });
    }
  }

  async function createNote() {
    const { form } = state;
    if (!form.name || !form.description) {
      return alert("please enter name and description");
    }
    const note = { ...form, clientId: CLIENT_ID, completed: false, id: uuid() };
    // add note to state before successful API call is 'optimistic response'. This is done to make UI fast. If API call fails, must remove note from state.
    dispatch({ type: "ADD_NOTE", note: note });
    dispatch({ type: "RESET_FORM" });

    try {
      await API.graphql({
        mutation: CreateNote,
      });
    } catch (err) {
      dispatch({ type: "ERROR" });
      console.log("Error: ", err);
    }
  }

  function handleInputChange(e) {
    dispatch({ type: "SET_INPUT", name: e.target.name, value: e.target.value });
  }

  function renderItem(item) {
    return (
      <List.Item key={item.id} style={styles.item}>
        <List.Item.Meta title={item.name} description={item.description} />
      </List.Item>
    );
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <div style={styles.container}>
      <Input
        name='description'
        style={styles.input}
        onChange={handleInputChange}
      />
      <Input name='name' style={styles.input} onChange={handleInputChange} />
      <Button onClick={createNote}>Add Note</Button>
      <List
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
      />
    </div>
  );
}

export default App;
