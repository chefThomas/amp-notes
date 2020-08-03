import React, { useEffect, useReducer } from "react";
// Amplify imports
import { API } from "aws-amplify";
import { listNotes } from "./graphql/queries";
import {
  createNote as CreateNote,
  deleteNote as DeleteNote,
  updateNote as UpdateNote,
} from "./graphql/mutations";
// Ant Design imports
import { Button, Input, List, PageHeader } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";

import "antd/dist/antd.css";
// misc imports
import { v4 as uuid } from "uuid";

// custom styling
import { App as styles } from "./styles/customStyles";

const CLIENT_ID = uuid();

// initialize state
const initialState = {
  notes: [], // from API
  error: false,
  loading: true, // display loading icon in UI
  form: {
    name: "",
    description: "",
  },
  editNote: false,
  noteId: null,
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
      case "SET_NOTE_EDIT_ID":
        return { ...state, noteId: action.noteId };
      case "TOGGLE_EDIT_NOTE":
        return { ...state, editNote: !state.editNote };
      default:
        return state;
    }
  }

  // NOTES ===========================
  // get all notes
  async function fetchNotes() {
    try {
      const results = await API.graphql({
        query: listNotes,
      });
      dispatch({ type: "SET_NOTES", notes: results.data.listNotes.items });
    } catch (err) {
      console.log("error: ", err);
      dispatch({ type: "ERROR" });
    }
  }
  // Add a note
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
        query: CreateNote,
        variables: { input: note },
      });
    } catch (err) {
      dispatch({ type: "ERROR" });
      console.log("Error: ", err);
    }
  }

  // remove a note
  async function deleteNote({ id }) {
    const notes = state.notes.filter((note) => note.id !== id);
    dispatch({ type: "SET_NOTES", notes });

    try {
      API.graphql({
        query: DeleteNote,
        variables: { input: { id } },
      });
    } catch (err) {
      dispatch({ type: "ERROR" });
      console.log("Deletion error: ", err);
    }
  }

  // update state and make note update API call
  async function updateNote() {
    // find note in state and update with form values
    const { form, noteId, notes } = state;

    if (!form.name || !form.description) {
      return alert("please enter name and description");
    }

    const updatedNotes = notes.map((note) =>
      note.id === noteId
        ? { ...note, name: form.name, description: form.description }
        : note
    );
    // update state
    dispatch({ type: "SET_NOTES", notes: updatedNotes });
    // update db
    try {
      const result = await API.graphql({
        query: UpdateNote,
        variables: {
          input: { id: noteId, name: form.name, description: form.description },
        },
      });
      dispatch({ type: "TOGGLE_EDIT_NOTE" });
      dispatch({ type: "RESET_FORM" });
      dispatch({ type: "SET_NOTE_EDIT_ID", noteId: initialState.noteId });
    } catch (err) {
      dispatch({ type: "ERROR" });
      console.log("update error", err);
    }
  }

  // control update/add note
  function handleNoteEdit(item) {
    // set state to edit mode. Edit mode sets add/edit note function of form button
    if (!state.editNote) {
      dispatch({ type: "SET_NOTE_EDIT_ID", noteId: item.id });
      // set form to selected note values
      dispatch({ type: "SET_INPUT", name: "name", value: item.name });
      dispatch({
        type: "SET_INPUT",
        name: "description",
        value: item.description,
      });
    } else {
      // reset note id
      dispatch({ type: "SET_NOTE_EDIT_ID", noteId: initialState.noteId });
      // reset form
      dispatch({ type: "RESET_FORM" });
    }

    dispatch({ type: "TOGGLE_EDIT_NOTE" });
  }

  // ===========================

  // Form input control
  function handleInputChange(e) {
    dispatch({ type: "SET_INPUT", name: e.target.name, value: e.target.value });
  }

  // render note. This function is a prop of antd List compoent
  function renderItem(item) {
    return (
      <List.Item key={item.id} style={styles.item}>
        <List.Item.Meta title={item.name} description={item.description} />
        <Button
          type='secondary'
          disabled={item.id === state.noteId}
          style={{ ...styles.listButton }}
          icon={<DeleteOutlined />}
          onClick={() => deleteNote(item)}
        />
        <Button
          type='secondary'
          style={styles.listButton}
          icon={<EditOutlined />}
          onClick={() => handleNoteEdit(item)}
        />
      </List.Item>
    );
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <div style={styles.container}>
      <PageHeader title='Notes App' subTitle='built with Amplify' />
      <div>
        <Input
          placeholder='Note Name'
          name='name'
          style={styles.input}
          onChange={handleInputChange}
          value={state.form.name}
        />
      </div>
      <div>
        <Input
          placeholder='Note Description'
          name='description'
          style={styles.input}
          onChange={handleInputChange}
          value={state.form.description}
        />
      </div>
      <Button type='primary' onClick={state.editNote ? updateNote : createNote}>
        {state.editNote ? "Edit Note" : "Add Note"}
      </Button>
      <hr></hr>
      <List
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
      />
    </div>
  );
}

export default App;
