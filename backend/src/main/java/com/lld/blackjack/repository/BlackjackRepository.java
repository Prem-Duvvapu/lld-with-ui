package com.lld.blackjack.repository;

import com.lld.blackjack.exception.TableNotFoundException;
import com.lld.blackjack.model.Table;
import com.lld.blackjack.shoe.Shoe;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for live tables plus the ONE {@link Shoe} they all share — pure CRUD, the same
 * shape as {@code locker.repository.LockerRepository}. No dealing or draw logic lives here; that
 * belongs to {@code BlackjackService}, which owns a second, independently constructed instance
 * of this class (with its own shoe) for its isolated {@code /sim/*} sandbox.
 */
@Repository
public class BlackjackRepository {

    private final Map<String, Table> tables = new ConcurrentHashMap<>();
    private volatile Shoe shoe;

    public void setShoe(Shoe shoe) {
        this.shoe = shoe;
    }

    public Shoe getShoe() {
        return shoe;
    }

    public void addTable(Table table) {
        tables.put(table.getId(), table);
    }

    public Table getTable(String id) {
        Table table = tables.get(id);
        if (table == null) {
            throw new TableNotFoundException("Table not found: " + id);
        }
        return table;
    }

    public List<Table> getAllTables() {
        return new ArrayList<>(tables.values());
    }

    public void reset() {
        tables.clear();
        shoe = null;
    }
}
