import React, { useEffect, useReducer } from "react";
import { API } from "aws-amplify";
import { List } from "antd";
import "antd/dist/antd.css";
import { listNotes } from "./graphql/queries";

const styles = {
  container: { padding: 20 },
  input: { marginBottom: 10 },
  item: {
    textAlign: "left",
  },
  p: { color: "#12890ff" },
};

function App() {
  // initialize state
  const initialState = {
    notes: [],
    error: false,
    loading: true,
  };

  // state
  const [state, dispatch] = useReducer(reducer, initialState);

  // reducer for useReducer hook
  function reducer(state, action) {
    switch (action.type) {
      case "SET_NOTES":
        return { ...state, notes: action.notes, loading: false };
      case "ERROR":
        return { ...state, error: true, loading: false };
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
      <List
        loading={state.loading}
        dataSource={state.notes}
        renderItem={renderItem}
      />
    </div>
  );
}

export default App;
